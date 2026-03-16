import { prisma } from '../db';

export type AchievementCategory = 'GLOBAL' | 'REACT' | 'CSS' | 'ALGORITHMS' | 'JAVASCRIPT';

export class AchievementService {
    /**
     * Awards a badge to a user if they don't already have it.
     */
    async awardBadge(userId: string, badgeName: string) {
        // Find the badge by name
        const badge = await prisma.badge.findFirst({
            where: { name: badgeName }
        });

        if (!badge) {
            console.error(`[AchievementService] Badge not found: ${badgeName}`);
            return null;
        }

        // Check if user already has it
        const existing = await prisma.userBadge.findUnique({
            where: {
                userId_badgeId: {
                    userId,
                    badgeId: badge.id
                }
            }
        });

        if (existing) return existing;

        // Award badge
        const award = await prisma.userBadge.create({
            data: {
                userId,
                badgeId: badge.id
            }
        });

        console.log(`[AchievementService] User ${userId} earned badge: ${badgeName}`);
        return award;
    }

    /**
     * Checks for milestone achievements based on quiz performance and course progress.
     */
    async checkMilestones(userId: string, context: { category?: string, quizScore?: number, totalSessions?: number }) {
        const { category, quizScore, totalSessions } = context;

        // 1. Perfect Score Mastery
        if (quizScore === 100 && category) {
            await this.awardBadge(userId, `${category} Specialist`);
        }

        // 2. Consistency Milestones
        if (totalSessions && totalSessions >= 10) {
            await this.awardBadge(userId, 'Dedicated Learner');
        }

        // 3. Early Bird (e.g., if we added logic to track time of day)
        // More sophisticated logic can be added here
    }

    /**
     * Initializes default badges if they don't exist in the DB.
     */
    async seedDefaultBadges() {
        const defaults = [
            { name: 'React Specialist', description: 'Acquire a perfect score in a React quiz.', iconUrl: 'https://cdn-icons-png.flaticon.com/512/1126/1126012.png', category: 'REACT' },
            { name: 'Dedicated Learner', description: 'Complete 10 learning sessions.', iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png', category: 'GLOBAL' },
            { name: 'First Milestone', description: 'Finish your first day of a course plan.', iconUrl: 'https://cdn-icons-png.flaticon.com/512/190/190411.png', category: 'GLOBAL' }
        ];

        for (const b of defaults) {
            await prisma.badge.upsert({
                where: { id: `default-${b.name.toLowerCase().replace(/\s+/g, '-')}` }, // deterministic ID for seeding
                update: {},
                create: {
                   id: `default-${b.name.toLowerCase().replace(/\s+/g, '-')}`,
                   ...b
                }
            });
        }
    }
}
