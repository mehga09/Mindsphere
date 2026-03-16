import { Request, Response } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const PreferenceSchema = z.object({
  topics: z.array(z.string()),
  dailyGoalMins: z.number().min(5).max(300),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = PreferenceSchema.parse(req.body);

    const preferences = await prisma.preference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    res.json(preferences);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
