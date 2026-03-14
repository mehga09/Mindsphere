import { prisma } from '../db';

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
      where: { id: userId }
    });

    if (!user) return;

    const now = new Date();
    const lastActivity = new Date(user.lastActivity);

    // Normalize both dates to midnight local time to calculate day difference correctly
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActivityStart = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

    const diffTime = todayStart.getTime() - lastActivityStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Last activity was exactly yesterday
      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak: { increment: 1 } }
      });
    } else if (diffDays > 1) {
      // Missed a day or more, reset streak to 1
      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak: 1 }
      });
    }
    // If diffDays === 0, active today, do nothing.
  }
}

// Keep old export for compatibility if needed, but optimally remove it.
// For now, let's stick to the class.

