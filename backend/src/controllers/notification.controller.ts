import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { z } from 'zod';
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const NotificationSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  message: z.string(),
});

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const subscription = SubscriptionSchema.parse(req.body);

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    res.status(201).json({ message: 'Subscribed' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const data = NotificationSchema.parse(req.body);

    // In a real app, you might want to verify if the user exists or has permissions
    // For now, we just send the email

    await emailService.sendEmail(data.to, data.subject, data.message);

    res.status(200).json({ message: 'Notification sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};