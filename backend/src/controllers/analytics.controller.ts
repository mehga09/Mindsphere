import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { EmailService } from '../services/email.service';
import { prisma } from '../db';

class AnalyticsController {

  async generateReport(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const report = await AnalyticsService.generateWeeklyReport(userId);

      // Send Email
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && user.email) {
          const emailService = new EmailService();
          await emailService.sendWeeklyReport(
            user.email,
            user.name || 'User',
            report.score,
            report.totalProductiveMins
          );
        }
      } catch (err) {
        console.error("Failed to send email during manual generation", err);
      }

      return res.status(200).json(report);
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to generate weekly report",
        error: error.message
      });
    }
  }

  async getLatestReport(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const report = await AnalyticsService.getLatestWeeklyReport(userId);

      return res.status(200).json(report);
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to fetch weekly report",
        error: error.message
      });
    }
  }
}

export default new AnalyticsController();
