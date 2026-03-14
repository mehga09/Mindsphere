import { Request, Response } from 'express';
import { GamificationService } from '../services/gamification.service';


export const completeSession = async (req: Request, res: Response) => {
  try {
    const { userId, durationSeconds } = req.body;

    await GamificationService.updateStreak(userId);
    const result = await GamificationService.awardXP(
      userId,
      durationSeconds
    );

    return res.status(200).json(result);

  } catch (error: any) {
    return res.status(500).json({
      message: "Gamification failed",
      error: error.message
    });
  }
};
