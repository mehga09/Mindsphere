import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initWorkers } from './jobs/worker';
import { logger } from './utils/logger';
import { metricsMiddleware, getMetrics } from './utils/metrics';

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import contentRoutes from './routes/content.routes';
import sessionRoutes from './routes/session.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import moderationRoutes from './routes/moderation.routes';
import scheduleRoutes from './routes/schedule.routes';
import analyticsRoutes from './routes/analytics.routes';
import gamificationRoutes from './routes/gamification.routes';
import quizRoutes from './routes/quiz.routes';
import taskRoutes from './routes/task.routes';
import dailyPlanRoutes from './routes/dailyPlan.routes';
import coursePlanRoutes from './routes/coursePlan.routes';




// Initialize workers
initWorkers();

import { globalLimiter } from './middleware/rateLimiter';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// Apply global rate limiter
app.use(globalLimiter);

// Observability Middleware
app.use(metricsMiddleware);
app.use(cors({
  origin: true, // Allow any origin
  credentials: true
}));
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.get('/metrics', getMetrics);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/content', quizRoutes); // Mounted under /api/content/:id/quiz
app.use('/gamification', gamificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/daily-plan', dailyPlanRoutes);
app.use('/api/course', coursePlanRoutes);




app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
