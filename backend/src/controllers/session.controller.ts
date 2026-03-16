import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { GamificationService } from '../services/gamification.service';

const StartSessionSchema = z.object({
  contentId: z.string(),
  studySessionId: z.string().optional(),
  dailyTaskId: z.string().optional(),
});

const EndSessionSchema = z.object({
  sessionId: z.string(),
  duration: z.number().optional(), // Client reported duration if needed, or computed
});

const EventBatchSchema = z.object({
  sessionId: z.string(),
  events: z.array(z.object({
    id: z.string().optional(), // Client UUID
    type: z.enum(['VIEW', 'COMPLETE', 'LIKE', 'SKIP', 'SHARE']),
    timestamp: z.string(), // ISO string
    metadata: z.any().optional(),
  })),
});

export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { contentId, studySessionId, dailyTaskId } = StartSessionSchema.parse(req.body);

    const session = await prisma.learningSession.create({
      data: {
        userId,
        contentId,
        studySessionId,
        dailyTaskId,
        startTime: new Date(),
      },
      include: {
        content: true
      }
    });

    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const endSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, duration } = EndSessionSchema.parse(req.body);

    const session = await prisma.learningSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const endTime = new Date();
    // Calculate duration in seconds if not provided or verify
    const computedDuration = Math.round((endTime.getTime() - session.startTime.getTime()) / 1000);

    const updatedSession = await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        duration: computedDuration,
        isCompleted: true,
      }
    });

    // If linked to a study session, mark it as completed
    if (updatedSession.studySessionId) {
      const studySession = await prisma.studySession.update({
        where: { id: updatedSession.studySessionId },
        data: { isCompleted: true }
      });

      // Auto-complete corresponding task
      if (studySession.taskId) {
        await prisma.learningTask.update({
          where: { id: studySession.taskId },
          data: { isCompleted: true }
        });
      } else {
        // Fallback: Flexible matching logic if no direct link (e.g., custom sessions)
        const tasks = await prisma.learningTask.findMany({
          where: { planId: studySession.planId, isCompleted: false }
        });

        const sessionTopicLower = studySession.topic.toLowerCase();
        
        for (const task of tasks) {
          const taskTitleLower = task.title.toLowerCase();
          
          const getKeyPhrases = (text: string) => text.split(/[\s,:-]+/).filter(w => w.length > 3);
          const taskWords = getKeyPhrases(taskTitleLower);
          const sessionWords = getKeyPhrases(sessionTopicLower);
          
          let matched = false;
          if (sessionTopicLower.includes(taskTitleLower) || taskTitleLower.includes(sessionTopicLower)) {
              matched = true;
          } else {
              let matchCount = 0;
              for (const word of sessionWords) {
                  if (taskTitleLower.includes(word)) matchCount++;
              }
              if (sessionWords.length > 0 && matchCount >= Math.max(1, Math.floor(sessionWords.length / 2))) {
                  matched = true;
              }
          }
          
          if (matched) {
             await prisma.learningTask.update({
               where: { id: task.id },
               data: { isCompleted: true }
             });
             break; // ONLY tick 1 task as per user request
          }
        }
      }
    }

    // If linked to a Daily Planner Task, mark it as completed
    if (updatedSession.dailyTaskId) {
      await prisma.dailyTask.update({
        where: { id: updatedSession.dailyTaskId },
        data: { isCompleted: true }
      }).catch(err => console.error('Failed to auto-complete daily task', err));
    }

    // Update streak before awarding XP because awardXP updates lastActivity to now
    await GamificationService.updateStreak(userId);
    await GamificationService.awardXP(userId, computedDuration, 'SESSION');
    await GamificationService.updateChallengeProgress(userId, 'SESSION');

    res.json(updatedSession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const logEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, events } = EventBatchSchema.parse(req.body);

    // Verify session ownership? 
    // For batch perf, maybe trust or simpler check. 
    // Let's verify.
    const session = await prisma.learningSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Bulk insert events
    // Transform timestamp string to Date
    const eventsData = events.map(e => ({
      // id: e.id, // Use client ID if provided? Prisma defaults to uuid if not present. 
      // If client provides ID, we should use it for idempotency.
      // But InteractionEvent.id is default(uuid). To use client ID, we need to allow setting it.
      // Schema says @default(uuid()), we can supply it.
      ...(e.id ? { id: e.id } : {}),
      sessionId,
      userId,
      type: e.type,
      timestamp: new Date(e.timestamp),
      metadata: e.metadata || {},
    }));

    // Use createMany? Postgres supports it.
    // Idempotency: createMany doesn't support skipDuplicates in all versions or databases? 
    // Prisma createMany supports skipDuplicates!
    await prisma.interactionEvent.createMany({
      data: eventsData,
      skipDuplicates: true, // Idempotency based on ID
    });

    res.json({ success: true, count: events.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
