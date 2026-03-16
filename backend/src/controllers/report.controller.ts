import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export const getLatestReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    // Get the most recent report
    const report = await prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' }
    });

    if (!report) {
      return res.status(404).json({ message: 'No reports generated yet' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};
