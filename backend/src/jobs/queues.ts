import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const reportQueue = new Queue('reports', { connection });
export const notificationQueue = new Queue('notifications', { connection });

export const QUEUES = {
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  HYDRATE_PLAN: 'hydrate-plan',
  DAILY_RECOMMENDATIONS: 'daily-recommendations',
};

export const hydratePlanQueue = new Queue('hydrate-plan', { connection });
export const dailyRecommendationQueue = new Queue('daily-recommendations', { connection });
