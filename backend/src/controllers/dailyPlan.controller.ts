import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DailyPlanService } from '../services/dailyPlan.service';
import { z } from 'zod';

const dailyPlanService = new DailyPlanService();

const GenerateSchema = z.object({
    topic: z.string().min(1, "Topic required")
});

export const generateDailyPlan = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { topic } = GenerateSchema.parse(req.body);
        const plan = await dailyPlanService.generateDailyPlan(userId, topic);
        
        res.json(plan);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to generate daily plan' });
    }
};

export const getDailyPlan = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const dateStr = req.query.date as string;
        const date = dateStr ? new Date(dateStr) : new Date();

        const plan = await dailyPlanService.getDailyPlan(userId, date);
        res.json(plan || { message: 'No daily plan found for this date' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch daily plan' });
    }
};

export const toggleDailyTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { taskId } = req.params;
        const task = await dailyPlanService.completeTask(taskId);
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to toggle task' });
    }
};
