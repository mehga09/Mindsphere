import { prisma } from '../db';

export class AnalyticsService {

  static async generateWeeklyReport(userId: string) {
    const now = new Date();

    // Get Monday start of week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);

    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    // Get completed sessions
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId,
        isCompleted: true,
        startTime: { gte: weekStart }
      }
    });

    const totalSessions = sessions.length;

    const totalProductiveMins = Math.floor(
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
    );

    // Get XP earned this week
    const xpLogs = await prisma.xPTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: weekStart }
      }
    });

    const totalXP = xpLogs.reduce((sum, x) => sum + x.amount, 0);

    // Engagement score (0–1 scale)
    const IDEAL_WEEKLY_MINS = 300;
    const score = Number(Math.min((totalProductiveMins / IDEAL_WEEKLY_MINS) * 100, 100).toFixed(2));

    // 4. Generate Chart Data (Daily Breakdown & Subject Mastery)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyStats = new Array(7).fill(0).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        day: days[d.getDay()],
        date: d.toLocaleDateString('en-CA'),
        minutes: 0
      };
    });

    const subjectMap: Record<string, number> = {};

    for (const s of sessions) {
      const sTime = new Date(s.startTime);
      const dayIndex = Math.floor((sTime.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      const mins = Math.round((s.duration || 0) / 60);

      if (dayIndex >= 0 && dayIndex < 7) {
        dailyStats[dayIndex].minutes += mins;
      }

      // Find Topic
      let topic = 'General';
      if (s.dailyTaskId) {
        const dt = await prisma.dailyTask.findUnique({
          where: { id: s.dailyTaskId },
          include: { dailyPlan: true }
        });
        if (dt?.dailyPlan.topic) topic = dt.dailyPlan.topic;
      } else if (s.studySessionId) {
        const ss = await prisma.studySession.findUnique({
          where: { id: s.studySessionId },
          include: { plan: true }
        });
        if (ss?.plan.topic) topic = ss.plan.topic;
      }

      subjectMap[topic] = (subjectMap[topic] || 0) + mins;
    }

    const subjectData = Object.entries(subjectMap).map(([subject, minutes]) => ({
      subject,
      minutes,
      fullMark: Math.max(...Object.values(subjectMap), 60)
    }));

    const chartData = {
      daily: dailyStats,
      subjects: subjectData
    };

    const report = await prisma.weeklyReport.upsert({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: weekStart
        }
      },
      update: {
        totalSessions,
        totalProductiveMins,
        score,
        chartData: chartData as any
      },
      create: {
        userId,
        weekStartDate: weekStart,
        totalSessions,
        totalProductiveMins,
        score,
        chartData: chartData as any
      }
    });

    return report;
  }

  static async getLatestWeeklyReport(userId: string) {
    return prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' }
    });
  }
}
