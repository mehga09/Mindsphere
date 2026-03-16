import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'mindsphere_' });

// Custom Metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

export const recommendationLatency = new client.Histogram({
  name: 'recommendation_generation_duration_seconds',
  help: 'Time taken to generate content recommendations',
  labelNames: ['strategy'],
  registers: [register],
});

export const activeSessions = new client.Gauge({
  name: 'active_learning_sessions',
  help: 'Number of currently active learning sessions',
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route: req.route ? req.route.path : req.path,
        status_code: res.statusCode.toString(),
      },
      duration / 1000
    );
  });
  
  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};
