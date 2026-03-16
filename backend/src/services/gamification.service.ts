import { prisma } from '../db';
import { differenceInDays, isSameDay } from 'date-fns';
import { AchievementService } from './achievement.service';

const achievementService = new AchievementService();

export class GamificationService {
  private static readonly XP_PER_MINUTE = 10;
  private static readonly LEVEL_BASE_XP = 100;

  static async awardXP(userId: string, durationSeconds: number, source: string = 'SESSION') {
    const minutes = durationSeconds / 60;
    const xpEarned = Math.round(minutes * this.XP_PER_MINUTE);

    if (xpEarned <= 0) {
      return { message: "No XP awarded" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User not found");
    }

    let newXP = user.currentXP + xpEarned;
    let newLevel = user.level;
    let xpRequired = newLevel * this.LEVEL_BASE_XP;

    while (newXP >= xpRequired) {
      newXP -= xpRequired;
      newLevel++;
      xpRequired = newLevel * this.LEVEL_BASE_XP;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentXP: newXP,
        level: newLevel,
        lastActivity: new Date()
      }
    });

    await prisma.xPTransaction.create({
      data: {
        userId,
        amount: xpEarned,
        source
      }
    });

    return {
      xpEarned,
      newXP,
      newLevel
    };
  }

  static async updateStreak(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, lastActivity: true }
    });

    if (!user) return;

    const now = new Date();
    const lastActivity = user.lastActivity;

    if (isSameDay(now, lastActivity)) {
        return user.currentStreak;
    }

    const daysDiff = differenceInDays(now, lastActivity);
    let newStreak = user.currentStreak;

    if (daysDiff === 1) {
        newStreak += 1;
    } else if (daysDiff > 1) {
        newStreak = 1;
    } else {
        if (newStreak === 0) newStreak = 1;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            currentStreak: newStreak,
            lastActivity: now
        }
    });

    console.log(`[GamificationService] Streak for user ${userId}: ${newStreak} days`);
    return newStreak;
  }

  static async awardBadge(userId: string, badgeName: string) {
      return achievementService.awardBadge(userId, badgeName);
  }

  static async checkQuizAchievements(userId: string, scorePercentage: number, contentTitle: string) {
      // Determine category from title (simple heuristic for now)
      let category = 'GLOBAL';
      const title = contentTitle.toLowerCase();
      if (title.includes('react')) category = 'REACT';
      else if (title.includes('javascript') || title.includes(' js')) category = 'JAVASCRIPT';
      else if (title.includes('css') || title.includes('html')) category = 'CSS';

      return achievementService.checkMilestones(userId, {
          category,
          quizScore: scorePercentage
      });
  }

  static async updateChallengeProgress(userId: string, type: string = 'SESSION') {
    // Find all active challenges for this user
    const enrollments = await prisma.userChallenge.findMany({
      where: { 
        userId,
        isCompleted: false
      },
      include: {
        challenge: true
      }
    });

    for (const enrollment of enrollments) {
      // Logic for Spring Sprint (5 sessions/courses)
      if (enrollment.challengeId === 'spring-sprint-2026') {
        const newProgress = enrollment.progress + 1;
        const reachedTarget = newProgress >= enrollment.target;

        await prisma.userChallenge.update({
          where: { id: enrollment.id },
          data: { 
            progress: newProgress,
            isCompleted: reachedTarget,
            completedAt: reachedTarget ? new Date() : null
          }
        });

        if (reachedTarget) {
          // Award XP bonus
          // Let's use 600 minutes as base for 10 XP/min = 6000 XP? No, 200 min = 2000 XP.
          // AwardXP(userId, seconds, source)
          await this.awardXP(userId, enrollment.challenge.xpReward * 6, 'CHALLENGE_COMPLETION');
          
          // Award Botanical Badge
          await this.awardBadge(userId, 'Botanical');
        }
      }
    }
  }

  static async seed() {
    await achievementService.seedDefaultBadges();
  }
}


// Keep old export for compatibility if needed, but optimally remove it.
// For now, let's stick to the class.

