import { prisma } from '../db';
import { LlmService } from './llm.service';

const llmService = new LlmService();

export class TaskService {
    async generateTasksForPlan(planId: string, topic: string, difficulty: string) {
        const generatedTitles = await llmService.generateLearningTasks(topic, difficulty);
        
        const tasksData = generatedTitles.map(title => ({
            planId,
            title,
            isCompleted: false
        }));

        await prisma.learningTask.createMany({
            data: tasksData
        });

        return this.getTasksByPlan(planId);
    }

    async getTasksByPlan(planId: string) {
        return prisma.learningTask.findMany({
            where: { planId },
            include: {
                sessions: {
                    select: {
                        sessionTime: true,
                        dayNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async completeTask(taskId: string) {
        const task = await prisma.learningTask.findUnique({ where: { id: taskId } });
        if (!task) throw new Error('Task not found');

        return prisma.learningTask.update({
            where: { id: taskId },
            data: { isCompleted: !task.isCompleted }
        });
    }
}
