import { jest } from '@jest/globals';

// Define mocks BEFORE imports
jest.mock('../src/db', () => ({
  prisma: {
    learningSession: { 
      create: jest.fn(), 
      findUnique: jest.fn(), 
      update: jest.fn() 
    },
    preference: { findUnique: jest.fn() },
    content: { findMany: jest.fn() },
    $transaction: jest.fn((cb: any) => cb({
       xPTransaction: { create: jest.fn() },
       user: { findUnique: jest.fn(), update: jest.fn() }
    })),
  }
}));

jest.mock('../src/services/gamification.service', () => ({
  GamificationService: {
    awardXP: jest.fn(),
    updateStreak: jest.fn()
  }
}));

// Mock Worker to avoid web-push errors
jest.mock('../src/jobs/worker', () => ({
  initWorkers: jest.fn()
}));

import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db';
import { GamificationService } from '../src/services/gamification.service';
import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET || 'access_secret';
const userId = 'test-user-id';

describe('Session API Integration', () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ userId, role: 'LEARNER' }, TEST_SECRET);
  });

  it('POST /api/sessions/start should return session ID', async () => {
    const mockSession = { id: 'session-123', userId, contentId: 'content-1', startTime: new Date() };
    (prisma.learningSession.create as any).mockResolvedValue(mockSession);

    const res = await request(app)
      .post('/api/sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentId: 'content-1' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('session-123');
  });

  it('POST /api/sessions/end should complete session and award XP', async () => {
    const mockSession = { 
        id: 'session-123', 
        userId, 
        startTime: new Date(Date.now() - 60000) // 1 min ago
    };
    
    (prisma.learningSession.findUnique as any).mockResolvedValue(mockSession);
    (prisma.learningSession.update as any).mockResolvedValue({ 
        ...mockSession, 
        endTime: new Date(), 
        duration: 60, 
        isCompleted: true 
    });

    const res = await request(app)
      .post('/api/sessions/end')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: 'session-123' });

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
    expect(GamificationService.awardXP).toHaveBeenCalled();
  });
});
