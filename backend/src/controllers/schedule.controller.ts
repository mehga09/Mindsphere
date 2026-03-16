
import { Response } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { StudyPlanService } from '../services/scheduler.service';

const studyPlanService = new StudyPlanService();

const GenerateSchema = z.object({
  topic: z.string().min(1, "Topic required"),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  endDate: z.string(), // ISO Date string or YYYY-MM-DD
  startDate: z.string().optional(), // ISO Date string or YYYY-MM-DD
}).refine(data => {
  const start = data.startDate ? new Date(data.startDate) : new Date();
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

export const generateSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = GenerateSchema.parse(req.body);
    const startDate = params.startDate ? new Date(params.startDate) : new Date();

    console.log(`[DEBUG] generateSchedule: userId=${userId}, topic=${params.topic}`);

    const plan = await studyPlanService.generatePlan({
      userId,
      topic: params.topic,
      difficulty: params.difficulty,
      endDate: new Date(params.endDate),
      startDate: startDate
    });

    console.log(`[DEBUG] generateSchedule: Plan created with ID=${plan?.id}`);

    res.json(plan);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
};

export const getSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log(`[DEBUG] getSchedule called for user: ${user?.email} (ID: ${userId})`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const plan = await studyPlanService.getPlan(userId);
    console.log(`[DEBUG] getPlan result for ${user?.email}: ${plan ? 'FOUND' : 'NOT FOUND'}`);
    res.json(plan || { message: 'No active study plan found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch study plan' });
  }
};

// Deprecated or used for manual overrides if needed
export const saveSchedule = async (req: AuthRequest, res: Response) => {
  res.status(501).json({ message: 'Use generateSchedule to create a new plan' });
};
