import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CoursePlanService } from '../services/coursePlan.service';
import { DailyPlanService } from '../services/dailyPlan.service';
import { z } from 'zod';

const coursePlanService = new CoursePlanService();
const dailyPlanService = new DailyPlanService(); // Reusing completeTask

const StartCourseSchema = z.object({
    topic: z.string().min(1, "Topic required")
});

export const startCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { topic } = StartCourseSchema.parse(req.body);
        const course = await coursePlanService.startCourse(userId, topic);
        res.json(course);
    } catch (error: any) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
        console.error(error);
        res.status(500).json({ error: 'Failed to start course' });
    }
};

export const getActiveCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const course = await coursePlanService.getActiveCourse(userId);
        res.json(course || { message: 'No active course found' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch active course' });
    }
};

export const getAllCourses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const courses = await coursePlanService.getAllCourses(userId);
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

export const generateTodayPlan = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const plan = await coursePlanService.generateTodayPlan(userId);
        res.json(plan || { message: 'Generate failed or course fully matched already' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate today plan' });
    }
};

export const recordDailyPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { courseId } = req.body; // could validate using zod but keeper simple
        if (!courseId) return res.status(400).json({ error: 'courseId required' });

        const course = await coursePlanService.recordDailyPerformance(userId, courseId);
        res.json(course);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to record performance' });
    }
};

export const pauseCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const result = await coursePlanService.pauseCourse(userId, id);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to pause course' });
    }
};

export const resumeCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const result = await coursePlanService.resumeCourse(userId, id);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to resume course' });
    }
};

export const completeCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const result = await coursePlanService.completeCourse(userId, id);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to complete course' });
    }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const result = await coursePlanService.deleteCourse(userId, id);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};

export const toggleCourseTask = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { taskId } = req.params;
        const task = await dailyPlanService.completeTask(taskId); // reusing
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to toggle task' });
    }
};
