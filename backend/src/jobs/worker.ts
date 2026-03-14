import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES, notificationQueue } from './queues';
import { prisma } from '../db';
import webpush from 'web-push';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Configure Web Push (using dummy keys if env not set for dev)
webpush.setVapidDetails(
  'mailto:admin@mindsphere.app',
  process.env.VAPID_PUBLIC_KEY || 'BEl6...',
  process.env.VAPID_PRIVATE_KEY || 'K7...'
);

import { EmailService } from '../services/email.service';
import { LlmService } from '../services/llm.service';
const emailService = new EmailService();

const reportWorker = new Worker(QUEUES.REPORTS, async (job: Job) => {
  console.log(`Processing report job ${job.id}`);
  const { userId, weekStartDate } = job.data;

  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  // 1. Fetch Sessions
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      startTime: { gte: start, lt: end },
      isCompleted: true
    }
  });

  // 2. Aggregate Totals
  const totalSessions = sessions.length;
  const totalProductiveMins = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60);

  // 3. Social Media Reduction Score (Proxy)
  // Assumption: Every minute spent here is a minute NOT doomscrolling.
  // Target: 10 hours/week (600 mins) = 100% score (Hard Mode).
  const score = Math.min(100, Math.round((totalProductiveMins / 600) * 100));

  // 4. Generate Chart Data (Daily Breakdown)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyStats = new Array(7).fill(0).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      day: days[d.getDay()],
      date: d.toISOString().split('T')[0],
      minutes: 0
    };
  });

  sessions.forEach(s => {
    const dayIndex = Math.floor((s.startTime.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < 7) {
      dailyStats[dayIndex].minutes += Math.round((s.duration || 0) / 60);
    }
  });

  // 5. Save Report
  // Upsert to avoid duplicates if job runs twice
  await prisma.weeklyReport.upsert({
    where: {
      userId_weekStartDate: { userId, weekStartDate: start }
    },
    update: {
      totalSessions,
      totalProductiveMins,
      score,
      chartData: dailyStats
    },
    create: {
      userId,
      weekStartDate: start,
      totalSessions,
      totalProductiveMins,
      score,
      chartData: dailyStats
    }
  });

  console.log(`Report generated for ${userId}: Score ${score}`);

  // 6. Trigger Notification (Push)
  await notificationQueue.add('send', {
    userId,
    title: 'Your Weekly Insight 🧠',
    body: `You saved ${totalProductiveMins} mins from doomscrolling this week! Score: ${score}/100`,
    url: '/analytics'
  });

  // 7. Send Email (Gmail)
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.email) {
      await emailService.sendWeeklyReport(user.email, user.name || 'User', score, totalProductiveMins);
      console.log(`Email report sent to ${user.email}`);
    }
  } catch (error) {
    console.error('Failed to send email report', error);
  }

}, { connection });

const notificationWorker = new Worker(QUEUES.NOTIFICATIONS, async (job: Job) => {
  console.log(`Processing notification for ${job.data.userId}`);
  const { userId, title, body, url } = job.data;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    const payload = JSON.stringify({ title, body, url });

    const promises = subscriptions.map(sub =>
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired/invalid, delete it
          return prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        console.error('Push error', err);
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Worker failed', error);
  }
}, { connection });

import { ContentFetcherService } from '../services/contentFetcher.service';

const hydratePlanWorker = new Worker(QUEUES.HYDRATE_PLAN, async (job: Job) => {
  console.log(`Hydrating plan ${job.data.planId}`);
  const { planId, topic, difficulty, tasks } = job.data;

  try {
    const fetcher = new ContentFetcherService();

    // Find sessions without content
    const sessions = await prisma.studySession.findMany({
      where: { planId, contentId: null },
      orderBy: { dayOffset: 'asc' }
    });

    const usedContentIds = new Set<string>();
    const taskVideoMap = new Map<string, any[]>();

    const llm = new LlmService();
    const usedGlobalVideoIds = new Set<string>();

    // Distribute content based on the generated tasks linked to sessions
    for (const session of sessions) {
      console.log(`Processing session ${session.id}: ${session.topic} (isPractice: ${session.isPractice})`);
      if (session.isPractice) {
        // Handle different types of practice/extra sessions
        if (session.topic.startsWith('Comprehensive Quiz:')) {
          console.log(`Generating quiz for ${topic}`);
          const quizQuestions = await llm.generateComprehensiveQuiz(topic);
          const specificTopic = `Comprehensive Quiz on ${topic}`;
          await prisma.studySession.update({
            where: { id: session.id },
            data: { topic: specificTopic }
          });
        } else if (session.topic.startsWith('Milestone Project:')) {
          console.log(`Generating project for ${topic}`);
          const projectPrompt = await llm.generateMilestoneProject(topic);
          await prisma.studySession.update({
            where: { id: session.id },
            data: { topic: `Milestone Project: ${projectPrompt}` }
          });
        } else {
          console.log(`Generating exercises for ${session.topic}`);
          const exercises = await llm.generatePracticeExercises(session.topic);
          await prisma.studySession.update({
            where: { id: session.id },
            data: { 
               topic: `${session.topic}\n\nExercise 1: ${exercises[0] || ''}\nExercise 2: ${exercises[1] || ''}` 
            }
          });
        }
        continue;
      }

      // Fetch specific video for this task
      console.log(`Fetching videos for session: "${session.topic}" in plan: ${planId}`);
      const contents = await fetcher.fetchSpecificVideoForTask(session.topic, topic);
      console.log(`Found ${contents?.length || 0} potential video(s) for "${session.topic}"`);

      if (contents && contents.length > 0) {
        // Global Deduplication: Find the first content NOT used yet in this plan
        let bestContent = contents.find(c => {
          const contentKey = c.externalId || c.id;
          return !usedGlobalVideoIds.has(contentKey);
        }) || contents[0];

        console.log(`Assigning content ${bestContent.id} (${bestContent.title}) to session ${session.id}`);

        // Add to global set to prevent repetition in the NEXT sessions
        const assignedKey = bestContent.externalId || bestContent.id;
        usedGlobalVideoIds.add(assignedKey);

        await prisma.studySession.update({
          where: { id: session.id },
          data: { contentId: bestContent.id }
        });
      } else {
        console.warn(`No videos found for task: ${session.topic}`);
      }
    }

    console.log(`Plan ${planId} hydrated with targeted, distinct content.`);

    // Notify User
    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (plan) {
      await notificationQueue.add('send', {
        userId: plan.userId,
        title: 'Study Plan Ready 📚',
        body: `Your custom plan for ${topic} is ready with video recommendations!`,
        url: '/schedule'
      });
    }
  } catch (error) {
    console.error(`Hydration failed for plan ${job.data.planId}:`, error);
  }
}, { connection });


import { getRecommendations } from '../services/recommendation.service';
import { dailyRecommendationQueue } from './queues';

const dailyRecommendationWorker = new Worker(QUEUES.DAILY_RECOMMENDATIONS, async (job: Job) => {
  console.log('Starting Daily Recommendation Job');

  try {
    const users = await prisma.user.findMany({});

    console.log(`Found ${users.length} users for daily recs.`);

    for (const user of users) {
      if (!user.email) continue;

      try {
        const videos = await getRecommendations(user.id);
        if (videos && videos.length > 0) {
          await emailService.sendVideoRecommendations(user.email, user.name || 'User', videos);
          console.log(`Daily recs sent to ${user.email}`);
        }
      } catch (err) {
        console.error(`Failed to send daily recs to ${user.id}`, err);
      }
    }
  } catch (error) {
    console.error('Daily Worker failed', error);
  }
}, { connection });

export const initWorkers = async () => {
  console.log('Workers initialized');

  // Schedule Daily Job (e.g., every day at 09:00 AM)
  // repeatable job
  try {
    await dailyRecommendationQueue.add(
      'daily-send',
      {},
      {
        repeat: { pattern: '0 9 * * *' } // Cron pattern: At 09:00
      }
    );
    console.log('Daily Recommendation Job Scheduled');
  } catch (e) {
    console.error('Failed to schedule daily job', e);
  }
};
