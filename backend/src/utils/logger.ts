import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'mindsphere-backend' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? combine(colorize(), simple()) 
        : json() 
    }),
  ],
});
