import { Response } from 'express';
import { savePreferences } from '../services/preference.service';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const PreferenceSchema = z.object({
  topics: z.array(z.string()),
  dailyGoalMins: z.number().min(5).max(300).optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate Input
    const { topics, quietHoursStart, quietHoursEnd, dailyGoalMins } = PreferenceSchema.parse(req.body);

    const result = await savePreferences(
      userId,
      topics,
      quietHoursStart,
      quietHoursEnd,
      dailyGoalMins
    );

    res.json(result);

  } catch (error: any) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
};
