import { prisma } from '../db';
import { LlmService } from './llm.service';
import { ContentFetcherService } from './contentFetcher.service';
import { CourseStatus } from '@prisma/client';

const llmService = new LlmService();
const contentFetcher = new ContentFetcherService();

const MAX_HOUR = 21; // Plan must end by 21:00

export class CoursePlanService {

    /**
     * Starts a new course and auto-pauses any existing active ones
     */
    async startCourse(userId: string, topic: string) {
        // 1. Auto-pause any current active course
        await prisma.coursePlan.updateMany({
            where: { userId, status: CourseStatus.ACTIVE },
            data: { status: CourseStatus.PAUSED }
        });

        // 2. Create new course
        const course = await prisma.coursePlan.create({
            data: {
                userId,
                topic,
                status: CourseStatus.ACTIVE
            }
        });

        // 3. Generate Roadmap via LLM
        const roadmap = await llmService.generateCourseRoadmap(topic).catch(err => {
            console.error('LLM Roadmap Generation Failed:', err);
            return [];
        });

        // 4. Create Topic Nodes
        if (roadmap && roadmap.length > 0) {
            const nodesData = roadmap.map((item: any, index: number) => ({
                courseId: course.id,
                topicName: item.topicName,
                orderIndex: index,
                isUnlocked: index === 0, // Unlock first node only
                isMastered: false
            }));

            await prisma.courseTopicNode.createMany({
                data: nodesData
            });
        }

        return this.getActiveCourse(userId);
    }

    /**
     * Pause a course
     */
    async pauseCourse(userId: string, courseId: string) {
        return prisma.coursePlan.updateMany({
            where: { id: courseId, userId },
            data: { status: CourseStatus.PAUSED }
        });
    }

    /**
     * Resume a course and auto-pause active ones
     */
    async resumeCourse(userId: string, courseId: string) {
        await prisma.coursePlan.updateMany({
            where: { userId, status: CourseStatus.ACTIVE, NOT: { id: courseId } },
            data: { status: CourseStatus.PAUSED }
        });

        await prisma.coursePlan.updateMany({
            where: { id: courseId, userId },
            data: { status: CourseStatus.ACTIVE }
        });

        return this.getActiveCourse(userId);
    }

    /**
     * Marks a course as completed
     */
    async completeCourse(userId: string, courseId: string) {
        return prisma.coursePlan.updateMany({
            where: { id: courseId, userId },
            data: { status: CourseStatus.COMPLETED }
        });
    }

    /**
     * Returns all courses with status and summary stats
     */
    async getAllCourses(userId: string) {
        return prisma.coursePlan.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { topicNodes: true }
                },
                topicNodes: {
                    where: { isMastered: true },
                    select: { id: true }
                },
                performance: {
                    orderBy: { dayNumber: 'desc' },
                    take: 1
                }
            }
        });
    }

    /**
     * Deletes a course plan and its linked data 
     */
    async deleteCourse(userId: string, courseId: string) {
        const course = await prisma.coursePlan.findUnique({
            where: { id: courseId, userId }
        });
        if (!course) throw new Error('Course not found');

        // 1. Unlink any DailyPlans referencing this course to avoid foreign key errors
        await prisma.dailyPlan.updateMany({
            where: { coursePlanId: courseId, userId },
            data: { coursePlanId: null }
        });

        // 2. Delete the CoursePlan (Cascades delete onto CourseTopicNode & DailyPerformance)
        await prisma.coursePlan.delete({
            where: { id: courseId }
        });

        return { success: true };
    }

    /**
     * Gets active course with nodes & performance
     */
    async getActiveCourse(userId: string) {
        return prisma.coursePlan.findFirst({
            where: { userId, status: CourseStatus.ACTIVE },
            include: {
                topicNodes: {
                    orderBy: { orderIndex: 'asc' }
                },
                performance: {
                    orderBy: { dayNumber: 'desc' },
                    take: 5
                }
            }
        });
    }

    /**
     * Generates or fetches today's daily plan for the active course
     */
    async generateTodayPlan(userId: string) {
        const course = await this.getActiveCourse(userId);
        if (!course) return null;

        // 1. Identify Current Topics & Review Topics
        const currentNodes = course.topicNodes.filter(n => n.isUnlocked && !n.isMastered);
        const activeNode = currentNodes[0] || course.topicNodes.find(n => !n.isMastered) || course.topicNodes[course.topicNodes.length - 1];
        if (!activeNode) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 2. Check if DailyPlan already exists for today & matches the current topic node
        let dailyPlan = await prisma.dailyPlan.findUnique({
            where: { userId_date: { userId, date: today } },
            include: { tasks: { include: { content: true }, orderBy: { startTime: 'asc' } } }
        });

        if (dailyPlan && dailyPlan.coursePlanId === course.id && dailyPlan.topic === activeNode.topicName) {
            return dailyPlan; // Already generated for this exact topic today
        }

        // Find review topics (failed or low score nodes)
        const perfHistory = course.performance;
        const reviewTopics: string[] = [];
        for (const perf of perfHistory) {
            if (perf.completionRate < 0.6 || perf.avgQuizScore < 0.5) {
                const node = course.topicNodes.find(n => n.id === perf.topicNodeId);
                if (node && !reviewTopics.includes(node.topicName)) {
                    reviewTopics.push(node.topicName);
                }
            }
        }

        // 3. Generate adaptive schedule from LLM
        const schedule = await llmService.generateAdaptiveDaySchedule(
            activeNode.topicName, 
            reviewTopics.slice(0, 3), // Limit review fallback
            course.dayNumber
        );

        // 4. Create/Clear DailyPlan
        if (dailyPlan) {
            await prisma.dailyPlan.update({
                where: { id: dailyPlan.id },
                data: { topic: activeNode.topicName, coursePlanId: course.id }
            });
            await prisma.dailyTask.deleteMany({ where: { dailyPlanId: dailyPlan.id } });
        } else {
            dailyPlan = await prisma.dailyPlan.create({
                data: { userId, topic: activeNode.topicName, coursePlanId: course.id, date: today },
                include: { tasks: { include: { content: true }, orderBy: { startTime: 'asc' } } }
            });
        }

        // 5. Hydrate Schedule with videos
        const usedContentIds = new Set<string>();
        const hydratedSequence = [];

        for (const task of schedule) {
            if (task.type === 'STUDY') {
                const videos = await contentFetcher.fetchSpecificVideoForTask(task.title, activeNode.topicName);
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

        // 6. Calculate Times
        let currentHour = 9;
        let currentMinute = 0;
        const finalTasksData = [];

        for (const task of hydratedSequence) {
            if (currentHour >= MAX_HOUR) break;

            const startTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            const endMinutes = currentHour * 60 + currentMinute + task.duration;
            const endHour = Math.floor(endMinutes / 60);

            let effectiveDuration = task.duration;
            if (endHour >= MAX_HOUR) {
                effectiveDuration = MAX_HOUR * 60 - (currentHour * 60 + currentMinute);
                if (effectiveDuration <= 0) break;
            }

            finalTasksData.push({
                dailyPlanId: dailyPlan!.id,
                title: task.title,
                type: task.type,
                duration: effectiveDuration,
                startTime: startTimeStr,
                contentId: (task as any).contentId || null
            });

            currentMinute += effectiveDuration;
            while (currentMinute >= 60) {
                currentHour++;
                currentMinute -= 60;
            }
        }

        await prisma.dailyTask.createMany({
            data: finalTasksData
        });

        // Return updated include
        return prisma.dailyPlan.findUnique({
            where: { id: dailyPlan!.id },
            include: { tasks: { include: { content: true }, orderBy: { startTime: 'asc' } } }
        });
    }

    /**
     * Records summary and triggers adaptive logic for tomorrow
     */
    async recordDailyPerformance(userId: string, courseId: string) {
        const course = await prisma.coursePlan.findUnique({
            where: { id: courseId },
            include: { topicNodes: { orderBy: { orderIndex: 'asc' } } }
        });
        if (!course || course.userId !== userId) throw new Error('Course not found');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyPlan = await prisma.dailyPlan.findUnique({
            where: { userId_date: { userId, date: today } },
            include: { tasks: true }
        });

        if (!dailyPlan || dailyPlan.coursePlanId !== courseId) throw new Error('No daily plan found for today linked to this course');

        const studyTasks = dailyPlan.tasks.filter(t => t.type === 'STUDY');
        const completedTasks = studyTasks.filter(t => t.isCompleted);
        
        const completionRate = studyTasks.length > 0 ? completedTasks.length / studyTasks.length : 0;
        
        // Avg quiz score: fetch LearningSessions from today's content?
        // Let's assume quiz content is linked. For now mock high scope or calculate statically
        // We can fetch Quiz performance data from db if present, or just use 0.8 for mock if missing
        let avgQuizScore = 0.8; // placeholder

        const activeNode = course.topicNodes.find(n => n.isUnlocked && !n.isMastered) || course.topicNodes.find(n => !n.isMastered);
        if (!activeNode) throw new Error('No active node to record performance against');

        // Upsert performance
        await prisma.dailyPerformance.upsert({
            where: { courseId_dayNumber: { courseId, dayNumber: course.dayNumber } },
            create: {
                courseId,
                topicNodeId: activeNode.id,
                dayNumber: course.dayNumber,
                completionRate,
                avgQuizScore,
                tasksTotal: studyTasks.length,
                tasksCompleted: completedTasks.length
            },
            update: {
                completionRate,
                avgQuizScore,
                tasksTotal: studyTasks.length,
                tasksCompleted: completedTasks.length
            }
        });

        // ==========================================
        // ADAPTIVE BACKEND LOGIC FOR NEXT DAY
        // ==========================================
        let advance = false;
        
        if (completionRate >= 0.8 && avgQuizScore >= 0.8) {
            // Mastered
            await prisma.courseTopicNode.update({ where: { id: activeNode.id }, data: { isMastered: true } });
            advance = true;
        } else if (completionRate >= 0.6 && avgQuizScore >= 0.5) {
            // Pass but weak
            advance = true; 
            // In generateTodayPlan, we will feed this node to review list for tomorrow
        } else {
            // Repeat node
            advance = false;
        }

        if (advance) {
            // Unlock next node
            const nextNode = course.topicNodes.find(n => n.orderIndex === activeNode.orderIndex + 1);
            if (nextNode) {
                await prisma.courseTopicNode.update({ where: { id: nextNode.id }, data: { isUnlocked: true } });
            } else {
                // Course Completed!
                await prisma.coursePlan.update({ where: { id: courseId }, data: { status: CourseStatus.COMPLETED } });
            }
        }

        // Increment Day
        await prisma.coursePlan.update({
            where: { id: courseId },
            data: { dayNumber: course.dayNumber + 1 }
        });

        return this.getActiveCourse(userId);
    }
}
