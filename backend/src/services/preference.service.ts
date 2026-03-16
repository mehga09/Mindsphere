import { prisma } from '../db';

export const savePreferences = async (
  userId: string,
  topics: string[],
  quietHoursStart?: string,
  quietHoursEnd?: string,
  dailyGoalMins?: number
) => {

  return prisma.preference.upsert({
    where: { userId },
    update: {
      topics,
      quietHoursStart,
      quietHoursEnd,
      dailyGoalMins
    },
    create: {
      userId,
      topics,
      quietHoursStart,
      quietHoursEnd,
      dailyGoalMins
    }
  });
};
