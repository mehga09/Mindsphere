import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { redis } from '../utils/redis';

export const getContents = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const contents = await prisma.content.findMany({
      skip,
      take: limit,
      include: {
        tags: { include: { tag: true } }
      }
    });

    const total = await prisma.content.count();

    res.json({
      data: contents,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

import { recommendationLatency } from '../utils/metrics';

// ...

export const getRecommendations = async (req: AuthRequest, res: Response) => {
  const endTimer = recommendationLatency.startTimer({ strategy: 'basic' });
  const userId = req.user?.userId;

  try {
    // 1. Check Cache
    const cacheKey = `recs:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      endTimer();
      return res.json(JSON.parse(cached));
    }

    // 2. Simple Recommendation Logic:
    // ... Get user preferences
    const prefs = await prisma.preference.findUnique({ where: { userId } });
    const topics = prefs?.topics || [];

    // ... Find content matching topics
    const recommendations = await prisma.content.findMany({
      where: {
        tags: { some: { tag: { name: { in: topics } } } }
      },
      take: 5,
      include: { tags: { include: { tag: true } } }
    });

    // Fallback logic
    let finalRecs = recommendations;
    if (finalRecs.length < 3) {
      const fallback = await prisma.content.findMany({
        take: 5 - finalRecs.length,
        where: { NOT: { id: { in: finalRecs.map(c => c.id) } } },
        include: { tags: { include: { tag: true } } }
      });
      finalRecs = [...finalRecs, ...fallback];
    }

    const results = finalRecs.map(content => ({
      ...content,
      explanation: topics.some(t => content.tags.some(ct => ct.tag.name === t)) 
        ? `Matches your interest in ${content.tags.find(ct => topics.includes(ct.tag.name))?.tag.name}`
        : 'Popular content to start your journey'
    }));

    // 3. Set Cache (10 minutes)
    await redis.setex(cacheKey, 600, JSON.stringify(results));

    endTimer(); // Stop timer
    res.json(results);
  } catch (error) {
    endTimer();
    console.error('Recs Error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};
