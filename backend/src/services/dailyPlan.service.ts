import { prisma } from '../db';
import { LlmService } from './llm.service';
import { ContentFetcherService } from './contentFetcher.service';

const llmService = new LlmService();
const contentFetcher = new ContentFetcherService();

const MAX_HOUR = 21; // Plan must end by 21:00
const MIN_STUDY_TASKS = 7; // Guarantee at least this many STUDY tasks with videos

export class DailyPlanService {
    
    async generateDailyPlan(userId: string, topic: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Create/Re-ensure DailyPlan record
        let dailyPlan = await prisma.dailyPlan.findFirst({
            where: { userId, date: today }
        });

        if (dailyPlan) {
            dailyPlan = await prisma.dailyPlan.update({
                where: { id: dailyPlan.id },
                data: { topic, updatedAt: new Date() }
            });
        } else {
            dailyPlan = await prisma.dailyPlan.create({
                data: { userId, topic, date: today }
            });
        }

        // 2. Clear existing tasks to avoid constraint issues during regeneration
        await prisma.dailyTask.deleteMany({
            where: { dailyPlanId: dailyPlan.id }
        });

        // 3. Get LLM Daily Schedule (≥7 STUDY tasks guaranteed by prompt)
        const llmSchedule = await llmService.generateDailySchedule(topic).catch(err => {
            console.error('LLM Schedule Generation Failed:', err);
            return [];
        });

        // 4. Get Latest Study Plan sessions/milestones for TODAY
        const latestPlan = await prisma.studyPlan.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                tasks: { 
                    where: { 
                        isCompleted: false,
                        sessions: {
                            some: {
                                date: { gte: today, lt: tomorrow }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }, 
                sessions: {
                    where: { 
                        isCompleted: false,
                        date: { gte: today, lt: tomorrow }
                    },
                    include: { content: true },
                    orderBy: { date: 'asc' }
                }
            }
        });

        // 5. Build raw task sequence: LLM tasks first, then Study Plan tasks for today
        const rawSequence: { 
            title: string, 
            type: any, 
            duration: number, 
            isCompleted: boolean, 
            contentId?: string | null, 
            studyPlanTaskId?: string | null 
        }[] = [];

        const usedContentIds = new Set<string>();

        // Add LLM generated tasks
        for (const item of llmSchedule) {
            rawSequence.push({
                title: item.title,
                type: item.type as any,
                duration: item.duration,
                isCompleted: false
            });
        }

        // Append pending Study Plan items for today
        if (latestPlan) {
            for (const session of latestPlan.sessions) {
                if (session.contentId) usedContentIds.add(session.contentId);
                rawSequence.push({
                    title: `[SESSION] ${session.topic.split('\n')[0]}`,
                    type: 'STUDY_PLAN_TASK' as any,
                    duration: Math.max(30, Math.floor((session.content?.duration || 1800) / 60)),
                    isCompleted: session.isCompleted,
                    contentId: session.contentId,
                    studyPlanTaskId: session.id
                });
            }
            // NOTE: [MILESTONE] tasks are intentionally excluded here.
            // Completing a [SESSION] automatically syncs its parent LearningTask via completeTask().
        }

        // 6. Ensure we have at least MIN_STUDY_TASKS LLM STUDY items (count only non-plan tasks)
        const studyCount = rawSequence.filter(t => t.type === 'STUDY').length;
        if (studyCount < MIN_STUDY_TASKS) {
            const missing = MIN_STUDY_TASKS - studyCount;
            const subtopics = [
                `${topic} Basics and Fundamentals`,
                `${topic} Setup and Configuration`,
                `${topic} Core Syntax and Features`,
                `${topic} Functions and Modules`,
                `${topic} Object Oriented Programming`,
                `${topic} Error Handling and Debugging`,
                `${topic} Advanced Patterns`,
                `${topic} Real World Project`,
                `${topic} Testing and Best Practices`,
            ];
            for (let i = 0; i < missing; i++) {
                rawSequence.push({
                    title: subtopics[i % subtopics.length],
                    type: 'STUDY' as any,
                    duration: 60,
                    isCompleted: false
                });
            }
        }

        // 6. Hydrate every STUDY task with a specific YouTube video match
        const hydratedSequence = [];

        for (const task of rawSequence) {
            if (task.type === 'STUDY' && !task.contentId) {
                const videos = await contentFetcher.fetchSpecificVideoForTask(task.title, topic);
                if (videos && videos.length > 0) {
                    const bestVideo = videos.find(v => !usedContentIds.has(v.id)) || videos[0];
                    usedContentIds.add(bestVideo.id);
                    hydratedSequence.push({
                        ...task,
                        contentId: bestVideo.id,
                        duration: Math.min(120, Math.max(15, Math.ceil(bestVideo.duration / 60)))
                    });
                } else {
                    hydratedSequence.push(task);
                }
            } else {
                hydratedSequence.push(task);
            }
        }

        // 7. Calculate Start Times (09:00 → 21:00 hard cap)
        let currentHour = 9;
        let currentMinute = 0;
        const finalTasksData = [];

        for (const task of hydratedSequence) {
            // Stop adding tasks once we hit 21:00
            if (currentHour >= MAX_HOUR) break;

            const startTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

            // Calculate end time for this task
            const endMinutes = currentHour * 60 + currentMinute + task.duration;
            const endHour = Math.floor(endMinutes / 60);

            // Trim the last task duration if it would go past 21:00
            let effectiveDuration = task.duration;
            if (endHour >= MAX_HOUR) {
                effectiveDuration = MAX_HOUR * 60 - (currentHour * 60 + currentMinute);
                if (effectiveDuration <= 0) break;
            }

            finalTasksData.push({
                dailyPlanId: dailyPlan.id,
                ...task,
                duration: effectiveDuration,
                startTime: startTimeStr,
            });

            // Advance clock
            currentMinute += effectiveDuration;
            while (currentMinute >= 60) {
                currentHour++;
                currentMinute -= 60;
            }
        }

        // 8. Create Tasks in DB
        await prisma.dailyTask.createMany({
            data: finalTasksData
        });

        return this.getDailyPlan(userId, today);
    }

    async getDailyPlan(userId: string, date: Date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        return prisma.dailyPlan.findUnique({
            where: { userId_date: { userId, date: d } },
            include: {
                tasks: {
                    include: { content: true },
                    orderBy: { startTime: 'asc' }
                }
            }
        });
    }

    async completeTask(taskId: string) {
        const task = await prisma.dailyTask.findUnique({ where: { id: taskId } });
        if (!task) throw new Error('Task not found');

        const updatedTask = await prisma.dailyTask.update({
            where: { id: taskId },
            data: { isCompleted: !task.isCompleted }
        });

        // Sync back to study plan if linked
        if (updatedTask.studyPlanTaskId) {
            // 1. Try to sync as a StudySession (priority for [SESSION] tasks)
            const sessionUpdate = await prisma.studySession.updateMany({
                where: { id: updatedTask.studyPlanTaskId },
                data: { isCompleted: updatedTask.isCompleted }
            }).catch(() => null);

            // 2. Try to sync as a LearningTask (priority for [MILESTONE] tasks)
            await prisma.learningTask.updateMany({
                where: { id: updatedTask.studyPlanTaskId },
                data: { isCompleted: updatedTask.isCompleted }
            }).catch(() => null);

            // 3. If it was a session, also update its parent task if applicable
            if (sessionUpdate && sessionUpdate.count > 0) {
                const session = await prisma.studySession.findUnique({
                    where: { id: updatedTask.studyPlanTaskId },
                    select: { taskId: true }
                });
                if (session?.taskId) {
                    await prisma.learningTask.update({
                        where: { id: session.taskId },
                        data: { isCompleted: updatedTask.isCompleted }
                    }).catch(() => null);
                }
            }
        }

        return updatedTask;
    }
}
