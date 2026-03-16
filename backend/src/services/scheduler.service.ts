import { prisma } from '../db';
import { QUEUES, hydratePlanQueue } from '../jobs/queues';
import { LlmService } from './llm.service';
import { TaskService } from './task.service';

const llmService = new LlmService();
const taskService = new TaskService();

interface GeneratePlanParams {
    userId: string;
    topic: string;
    difficulty: string; // Beginner, Intermediate, Advanced
    startDate: Date;
    endDate: Date;
}

export class StudyPlanService {
    async generatePlan(params: GeneratePlanParams) {
        const { userId, topic, difficulty, startDate, endDate } = params;

        // 2. Create Plan Record
        const plan = await prisma.studyPlan.create({
            data: {
                userId,
                topic,
                difficulty,
                startDate: startDate,
                endDate: endDate
            }
        });

        // 3. Generate Skeleton Sessions (70% coverage rule for now, weekends lighter?)
        // Calculate total days between start and end date (inclusive)
        const diffTime = endDate.getTime() - startDate.getTime();
        const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

        // 3. Generate Tasks Synchronously
        const tasks = await taskService.generateTasksForPlan(plan.id, topic, difficulty);

        // 4. Map Tasks to Sessions
        const sessionsData = [];
        
        // Calculate tasks per day
        const tasksPerDay = Math.ceil(tasks.length / totalDays);
        let taskIndex = 0;

        for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + dayOffset);
            const dayNumber = dayOffset + 1; // 1-indexed for UI

            let hourStart = 9; // Default starting hour is 09:00

            if (taskIndex < tasks.length) {
                // Determine how many tasks to schedule today (up to tasksPerDay, but bounded by remaining tasks)
                const tasksToday = Math.min(tasksPerDay, tasks.length - taskIndex);

                for (let i = 0; i < tasksToday; i++) {
                    const task = tasks[taskIndex];
                    // Format time as HH:00
                    const sessionTime = `${hourStart.toString().padStart(2, '0')}:00`;

                    sessionsData.push({
                        planId: plan.id,
                        taskId: task.id,
                        dayOffset,
                        dayNumber,
                        date: date,
                        topic: task.title,
                        sessionTime,
                        isCompleted: false,
                        isPractice: false
                    });

                    taskIndex++;
                    hourStart++; // Increment hour for the next task on the same day
                }
            } else {
                // Diversify extra days to prevent monotony
                const extraDayIndex = dayOffset - Math.ceil(tasks.length / tasksPerDay) + 1;
                
                let sessionTopic = "";
                if (extraDayIndex === 1) {
                    sessionTopic = `Comprehensive Quiz: ${topic}`;
                } else if (extraDayIndex === 2) {
                    sessionTopic = `Milestone Project: ${topic}`;
                } else {
                    sessionTopic = `${topic} Focused Practice`;
                }

                const sessionTime = `${hourStart.toString().padStart(2, '0')}:00`;
                
                sessionsData.push({
                    planId: plan.id,
                    taskId: tasks.length > 0 ? tasks[tasks.length - 1].id : null,
                    dayOffset,
                    dayNumber,
                    date: date,
                    topic: sessionTopic,
                    sessionTime,
                    isCompleted: false,
                    isPractice: true
                });
            }
        }

        await prisma.studySession.createMany({
            data: sessionsData
        });

        // 5. Trigger Async Content Hydration passing the generated tasks and topic
        await hydratePlanQueue.add('hydrate', {
            planId: plan.id,
            topic,
            difficulty,
            tasks
        });

        // 6. Return the full plan with sessions
        return this.getPlan(userId);
    }



    async getPlan(userId: string) {
        return prisma.studyPlan.findFirst({
            where: { userId },
            include: {
                sessions: {
                    include: { content: true },
                    orderBy: { dayOffset: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
