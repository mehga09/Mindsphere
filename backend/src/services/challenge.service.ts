import { prisma } from '../db';

export class ChallengeService {
    async getActiveChallenges() {
        const now = new Date();
        return prisma.challenge.findMany({
            where: {
                startDate: { lte: now },
                endDate: { gte: now }
            }
        });
    }

    async joinChallenge(userId: string, challengeId: string) {
        // In a real app, we'd track progress specifically for this challenge
        // For now, let's just create a link
        return (prisma as any).userChallenge.create({
            data: { userId, challengeId }
        });
    }

    async seedDefaultChallenges() {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(now.getMonth() + 1);

        await prisma.challenge.upsert({
            where: { id: 'spring-sprint-2026' },
            update: {},
            create: {
                id: 'spring-sprint-2026',
                title: 'Spring Sprint',
                description: 'Complete 5 courses this month to earn the Botanical badge!',
                type: 'SEASONAL',
                xpReward: 2000,
                startDate: now,
                endDate: nextMonth
            }
        });
    }
}
