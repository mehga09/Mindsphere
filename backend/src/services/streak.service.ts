import { prisma } from '../db';
import { differenceInDays, isSameDay } from 'date-fns';

export class StreakService {
    /**
     * Updates the user's daily learning streak.
     * Should be called whenever a user completes a meaningful action (quiz, session, etc.)
     */
    async updateStreak(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currentStreak: true, lastActivity: true }
        });

        if (!user) return;

        const now = new Date();
        const lastActivity = user.lastActivity;

        // 1. If activity is on the same day, do nothing (streak already counted for today)
        if (isSameDay(now, lastActivity)) {
            return user.currentStreak;
        }

        const daysDiff = differenceInDays(now, lastActivity);
        let newStreak = user.currentStreak;

        // 2. If it's exactly the day after the last activity, increment the streak
        if (daysDiff === 1) {
            newStreak += 1;
        } 
        // 3. If it's been more than a day, the streak is broken, reset to 1
        else if (daysDiff > 1) {
            newStreak = 1;
        }
        // 4. Initial activity or edge case (lastActivity was far in the past)
        else {
            if (newStreak === 0) newStreak = 1;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                currentStreak: newStreak,
                lastActivity: now
            }
        });

        console.log(`[StreakService] Updated streak for user ${userId}: ${newStreak} days`);
        return updatedUser.currentStreak;
    }

    /**
     * Returns the current streak count.
     */
    async getStreak(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currentStreak: true, lastActivity: true }
        });

        if (!user) return 0;

        // Check if streak is already dead (missed more than 24 hours)
        const now = new Date();
        if (differenceInDays(now, user.lastActivity) > 1) {
            return 0;
        }

        return user.currentStreak;
    }
}
