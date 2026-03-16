import { Request, Response } from 'express';
import { getRecommendations } from '../services/recommendation.service';
import { prisma } from '../db';
import { EmailService } from '../services/email.service';
import { AuthRequest } from '../middleware/auth';

export const fetchRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = await getRecommendations(userId);

    res.json(data);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendRecommendationEmail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Get Recommendations
    const videos = await getRecommendations(userId);

    // 2. Get User Email
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.email) {
      return res.status(404).json({ error: 'User email not found' });
    }

    // 3. Send Email
    const emailService = new EmailService();
    const sent = await emailService.sendVideoRecommendations(user.email, user.name || 'User', videos);

    if (sent) {
      res.status(200).json({ message: 'Recommendations sent to email' });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
