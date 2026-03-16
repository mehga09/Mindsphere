import { prisma } from '../db';
import { redis } from '../utils/redis';
import { recommendationLatency } from '../utils/metrics';

export const getRecommendations = async (userId: string) => {
  const endTimer = recommendationLatency.startTimer({ strategy: 'basic' });

  try {
    // 1. Check Cache
    const cacheKey = `recs:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      endTimer();
      return JSON.parse(cached);
    }

    // 2. Simple Recommendation Logic:
    const prefs = await prisma.preference.findUnique({ where: { userId } });
    const topics = prefs?.topics || [];

    // Find content matching topics
    const recommendations = await prisma.content.findMany({
      where: {
        tags: { some: { tag: { name: { in: topics } } } }
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
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

    endTimer();
    return results;

  } catch (error) {
    endTimer();
    console.error('Recs Error:', error);
    throw error;
  }
};
