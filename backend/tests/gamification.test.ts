import { GamificationService } from '../src/services/gamification.service';
import { prisma } from '../src/db';

// Mock Prisma
jest.mock('../src/db', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    xPTransaction: { create: jest.fn() },
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
  },
}));

describe('GamificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('awardXP', () => {
    it('should award XP and level up user if threshold reached', async () => {
      const mockUser = {
        id: 'user1',
        currentXP: 90,
        level: 1,
        currentStreak: 1,
        lastActivity: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Award 10 minutes (100 XP). 90 + 100 = 190. Threshold for Level 1 is 100.
      // New XP = 90. Level 2.
      await GamificationService.awardXP('user1', 600, 'SESSION');

      expect(prisma.xPTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 100 })
      }));

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user1' },
        data: expect.objectContaining({ currentXP: 90, level: 2, lastActivity: expect.any(Date) })
      }));
    });
  });

  describe('updateStreak', () => {
    it('should increment streak if last activity was yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockUser = {
        id: 'user1',
        currentStreak: 1,
        lastActivity: yesterday,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await GamificationService.updateStreak('user1');

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user1' },
        data: { currentStreak: { increment: 1 } }
      }));
    });

    it('should reset streak to 1 if last activity was more than 1 day ago', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockUser = {
        id: 'user1',
        currentStreak: 5,
        lastActivity: twoDaysAgo,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await GamificationService.updateStreak('user1');

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user1' },
        data: { currentStreak: 1 }
      }));
    });

    it('should do nothing if last activity was today', async () => {
      const today = new Date();

      const mockUser = {
        id: 'user1',
        currentStreak: 5,
        lastActivity: today,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await GamificationService.updateStreak('user1');

      // The mock might have been called in previous tests since we use beforeEach jest.clearAllMocks(),
      // wait, we mockResolvedValue so we should expect not to have been called.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
