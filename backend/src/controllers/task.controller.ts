import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { TaskService } from '../services/task.service';

const taskService = new TaskService();

const GenerateSchema = z.object({
  topic: z.string().min(1, "Topic required"),
  planId: z.string().min(1, "Plan ID required"),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
});

export const generateTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = GenerateSchema.parse(req.body);

    const tasks = await taskService.generateTasksForPlan(params.planId, params.topic, params.difficulty);
    res.json(tasks);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.params;
    if (!planId) return res.status(400).json({ error: 'Plan ID required' });

    const tasks = await taskService.getTasksByPlan(planId);
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const toggleCompleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: 'Task ID required' });

    const updatedTask = await taskService.completeTask(taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};
