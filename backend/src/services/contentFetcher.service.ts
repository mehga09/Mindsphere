
import { PrismaClient, ContentType, Content } from '@prisma/client';
import axios from 'axios';
import { prisma } from '../db';
import { parseISO8601Duration } from '../utils/duration';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface FetchOptions {
    topic: string;
    difficulty?: string;
    limit?: number;
}

export class ContentFetcherService {

    /**
     * Fetches content for a given topic, prioritizing local DB then external sources.
     */
    async fetchContentForTopic(options: FetchOptions): Promise<Content[]> {
        const { topic, difficulty, limit = 5 } = options;
        console.log(`Fetching content for: ${topic} (${difficulty})`);

        // 1. Search Local DB
        // We match against tags or title
        let localContent = await prisma.content.findMany({
            where: {
                OR: [
                    { title: { contains: topic, mode: 'insensitive' } },
                    { tags: { some: { tag: { name: { contains: topic, mode: 'insensitive' } } } } }
                ],
                // Optional: Filter by difficulty if added to Content model
            },
            take: limit
        });

        if (localContent.length >= limit) {
            return localContent;
        }

        // 2. Fetch from External (YouTube) if needed
        const needed = limit - localContent.length;
        const externalContent = await this.fetchFromYouTube(topic, needed);

        // 3. Save External Content to DB
        const savedExternalContent = [];
        for (const item of externalContent) {
            // Check for duplicates by externalId
            const existing = await prisma.content.findUnique({
                where: { externalId: item.externalId }
            });

            if (!existing) {
                // Create new content
                const created = await prisma.content.create({
                    data: {
                        title: item.title,
                        description: item.description,
                        url: item.url,
                        source: 'YouTube',
                        type: ContentType.VIDEO,
                        duration: item.duration || 600, // Use fetched duration or fallback
                        thumbnail: item.thumbnail,
                        externalId: item.externalId,
                        difficulty: difficulty,
                        tags: {
                            create: {
                                tag: {
                                    connectOrCreate: {
                                        where: { name: topic },
                                        create: { name: topic }
                                    }
                                }
                            }
                        }
                    }
                });
                savedExternalContent.push(created);
            } else {
                savedExternalContent.push(existing);
            }
        }

        return [...localContent, ...savedExternalContent];
    }

    private async fetchFromYouTube(query: string, limit: number): Promise<any[]> {
        if (!YOUTUBE_API_KEY) {
            console.warn('YOUTUBE_API_KEY not set. Using mock data.');
            return this.getMockYouTubeData(query, limit);
        }

        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: query + ' tutorial', // Append tutorial for better results
                    type: 'video',
                    key: YOUTUBE_API_KEY,
                    maxResults: limit
                }
            });

            const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');

            // Follow-up request to get durations
            const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'contentDetails,snippet',
                    id: videoIds,
                    key: YOUTUBE_API_KEY
                }
            });

            return detailsResponse.data.items.map((item: any) => {
                const duration = parseISO8601Duration(item.contentDetails.duration);
                console.log(`Fetched duration for ${item.id}: ${duration}s`);
                return {
                    externalId: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                    duration
                };
            });
        } catch (error) {
            console.error('YouTube API Error:', error);
            return this.getMockYouTubeData(query, limit); // Fallback to mock
        }
    }

    private getMockYouTubeData(query: string, limit: number): any[] {
        return Array.from({ length: limit }).map((_, i) => ({
            externalId: `mock_${query}_${i}_${Date.now()}`,
            title: `${query} Tutorial Part ${i + 1} (Mock)`,
            description: `This is a mock video description for learning ${query}.`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', // Rickroll thumbnail as placeholder
            duration: Math.floor(Math.random() * (3600 - 300 + 1)) + 300 // Random 5-60 mins (in seconds)
        }));
    }

    /**
     * Fetches a large batch of videos for a topic in ONE YouTube API call.
     * Returns up to 50 results so the caller can pick the best match per task.
     * Saves all fetched videos to the DB tagged with the topic.
     */
    async fetchBatchVideosForTopic(topic: string): Promise<Content[]> {
        console.log(`Fetching batch videos for topic: "${topic}"`);

        // Check DB first — if we already have enough tagged videos, skip the API call
        const existing = await prisma.content.findMany({
            where: {
                source: 'YouTube',
                tags: { some: { tag: { name: { contains: topic, mode: 'insensitive' } } } }
            },
            take: 50
        });

        if (existing.length >= 10) {
            console.log(`DB has ${existing.length} videos for topic "${topic}" — skipping API call.`);
            return existing;
        }

        if (!YOUTUBE_API_KEY) {
            console.warn('No YOUTUBE_API_KEY — returning existing DB videos for topic.');
            return existing;
        }

        try {
            const publishedAfter = new Date();
            publishedAfter.setFullYear(publishedAfter.getFullYear() - 10);

            // Single search call — 100 quota units total (vs 800+ for per-task searches)
            const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: `${topic} tutorial`,
                    type: 'video',
                    key: YOUTUBE_API_KEY,
                    maxResults: 50,
                    publishedAfter: publishedAfter.toISOString()
                }
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                console.log(`No YouTube batch results for topic: "${topic}"`);
                return existing;
            }

            const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');

            // Fetch full details (1 quota unit)
            const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: { part: 'contentDetails,snippet,statistics', id: videoIds, key: YOUTUBE_API_KEY }
            });

            const topicTag = await prisma.tag.upsert({ where: { name: topic }, update: {}, create: { name: topic } });
            const results: Content[] = [];

            for (const item of detailsResponse.data.items) {
                const duration = parseISO8601Duration(item.contentDetails.duration);
                // Accept videos between 5 min (300s) and 4 hours (14400s)
                if (duration < 300 || duration > 14400) continue;

                const viewCount = parseInt(item.statistics.viewCount || '0', 10);
                const externalId = item.id;

                let record = await prisma.content.findUnique({ where: { externalId } });
                if (!record) {
                    record = await prisma.content.create({
                        data: {
                            title: item.snippet.title,
                            description: item.snippet.description,
                            url: `https://www.youtube.com/watch?v=${externalId}`,
                            source: 'YouTube',
                            type: ContentType.VIDEO,
                            duration,
                            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                            externalId,
                            tags: {
                                create: {
                                    tag: { connectOrCreate: { where: { name: topic }, create: { name: topic } } }
                                }
                            }
                        }
                    });
                } else {
                    // Ensure it's tagged with topic
                    await prisma.contentTag.upsert({
                        where: { contentId_tagId: { contentId: record.id, tagId: topicTag.id } },
                        update: {},
                        create: { contentId: record.id, tagId: topicTag.id }
                    }).catch(() => {});
                }
                (record as any)._viewCount = viewCount; // attach for sorting
                results.push(record);
            }

            // Sort by viewCount descending
            results.sort((a: any, b: any) => (b._viewCount || 0) - (a._viewCount || 0));
            console.log(`Batch fetched ${results.length} videos for topic "${topic}".`);
            return results;

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error(`Batch YouTube API error for "${topic}":`, error.response?.status, error.response?.data?.error?.message);
            } else {
                console.error('fetchBatchVideosForTopic error:', error);
            }
            // If we have topic-specific cache, use it
            if (existing.length > 0) return existing;
            // Last resort: return ANY cached YouTube videos so keyword matching has something to work with
            console.warn(`No topic-cached videos for "${topic}" — using general DB pool as fallback.`);
            return prisma.content.findMany({ where: { source: 'YouTube' }, orderBy: { createdAt: 'desc' }, take: 50 });
        }
    }

    /**
     * Given a batch of videos and a task title, picks the best matching video
     * by scoring keyword overlap between the task title and video title.
     */
    pickBestVideoForTask(taskTitle: string, videoPool: Content[], usedIds: Set<string>): Content | null {
        const taskWords = new Set(
            taskTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        );

        let bestScore = -1;
        let bestVideo: Content | null = null;

        for (const video of videoPool) {
            if (usedIds.has(video.id)) continue; // don't reuse the same video
            const titleWords = video.title.toLowerCase().split(/\s+/);
            const score = titleWords.filter(w => taskWords.has(w)).length;
            if (score > bestScore) {
                bestScore = score;
                bestVideo = video;
            }
        }

        // If no keyword match, pick first unused video
        if (!bestVideo) {
            bestVideo = videoPool.find(v => !usedIds.has(v.id)) || null;
        }

        return bestVideo;
    }

    /**
     * Fetches a specific video for a task title.
     * Fallback chain:
     *   L1: Task-title tag in DB (exact re-use, no API call)
     *   L2: YouTube API (fresh, quota-consuming)
     *   L3: Topic-tagged videos in DB (quota-exhausted fallback)
     */
    async fetchSpecificVideoForTask(taskTitle: string, topic: string): Promise<Content[]> {
        console.log(`Fetching specific video for task: "${taskTitle}" (Topic: ${topic})`);

        // LEVEL 1: Exact cache hit — video previously tagged with this task title
        const cached = await prisma.content.findMany({
            where: {
                source: 'YouTube',
                OR: [
                    { tags: { some: { tag: { name: taskTitle } } } },
                ]
            },
            take: 5
        });

        if (cached.length >= 1) {
            console.log(`L1 cache hit for "${taskTitle}" — ${cached.length} video(s).`);
            return cached;
        }

        // Helper: Level 3 — topic-level DB fallback
        const topicFallback = async (): Promise<Content[]> => {
            const hits = await prisma.content.findMany({
                where: {
                    source: 'YouTube',
                    tags: { some: { tag: { name: { contains: topic, mode: 'insensitive' } } } }
                },
                take: 5
            });
            if (hits.length > 0) console.log(`L3 topic fallback for "${taskTitle}" — ${hits.length} video(s) from topic "${topic}".`);
            return hits;
        };

        // LEVEL 2: Fetch from YouTube API
        if (!YOUTUBE_API_KEY) {
            console.warn('YOUTUBE_API_KEY not set. Trying topic DB fallback then mock.');
            const fallback = await topicFallback();
            if (fallback.length > 0) return fallback;
            const mocks = this.getMockYouTubeData(`${taskTitle} ${topic}`, 5);
            const results = [];
            for (const mock of mocks) {
                const created = await prisma.content.create({
                    data: {
                        title: mock.title,
                        description: mock.description,
                        url: mock.url,
                        source: 'YouTube',
                        type: ContentType.VIDEO,
                        duration: mock.duration,
                        thumbnail: mock.thumbnail,
                        externalId: mock.externalId,
                        tags: {
                            create: {
                                tag: { connectOrCreate: { where: { name: topic }, create: { name: topic } } }
                            }
                        }
                    }
                });
                // Also tag with task title for future cache hits
                const taskTag = await prisma.tag.upsert({ where: { name: taskTitle }, update: {}, create: { name: taskTitle } });
                await prisma.contentTag.upsert({
                    where: { contentId_tagId: { contentId: created.id, tagId: taskTag.id } },
                    update: {},
                    create: { contentId: created.id, tagId: taskTag.id }
                });
                results.push(created);
            }
            return results;
        }

        try {
            const publishedAfter = new Date();
            publishedAfter.setFullYear(publishedAfter.getFullYear() - 10);
            const query = `${taskTitle} ${topic} tutorial`;

            const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    key: YOUTUBE_API_KEY,
                    maxResults: 20,
                    publishedAfter: publishedAfter.toISOString()
                }
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                console.log(`No YouTube results for: "${query}"`);
                return [];
            }

            const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');

            const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: { part: 'contentDetails,snippet,statistics', id: videoIds, key: YOUTUBE_API_KEY }
            });

            let validVideos = detailsResponse.data.items.map((item: any) => {
                const duration = parseISO8601Duration(item.contentDetails.duration);
                const viewCount = parseInt(item.statistics.viewCount || '0', 10);
                return {
                    externalId: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    url: `https://www.youtube.com/watch?v=${item.id}`,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                    duration,
                    viewCount
                };
            }).filter((v: any) => {
                const ok = v.duration >= 600 && v.duration <= 10800;
                if (!ok) console.log(`Skipping "${v.title}" — ${Math.round(v.duration / 60)}m`);
                return ok;
            });

            if (validVideos.length === 0) {
                console.log(`No duration-valid videos for task: "${taskTitle}"`);
                return [];
            }

            validVideos.sort((a: any, b: any) => b.viewCount - a.viewCount);

            // Ensure task-title tag exists once (reused for all videos in this task)
            const taskTag = await prisma.tag.upsert({ where: { name: taskTitle }, update: {}, create: { name: taskTitle } });

            const results = [];
            for (const video of validVideos.slice(0, 5)) {
                let record = await prisma.content.findUnique({ where: { externalId: video.externalId } });

                if (!record) {
                    // Save new video — tag with topic (original working pattern)
                    record = await prisma.content.create({
                        data: {
                            title: video.title,
                            description: video.description,
                            url: video.url,
                            source: 'YouTube',
                            type: ContentType.VIDEO,
                            duration: video.duration,
                            thumbnail: video.thumbnail,
                            externalId: video.externalId,
                            tags: {
                                create: {
                                    tag: { connectOrCreate: { where: { name: topic }, create: { name: topic } } }
                                }
                            }
                        }
                    });
                }

                // Tag with task title so future lookups (Level 1) find this exact video
                await prisma.contentTag.upsert({
                    where: { contentId_tagId: { contentId: record.id, tagId: taskTag.id } },
                    update: {},
                    create: { contentId: record.id, tagId: taskTag.id }
                });

                results.push(record);
            }

            return results;

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error(`YouTube API error for "${taskTitle}":`, error.response?.status, error.response?.data?.error?.message || error.response?.data);
            } else {
                console.error('fetchSpecificVideoForTask error:', error);
            }
            
            // L3: YouTube failed — serve cached topic videos
            const fallback = await topicFallback();
            if (fallback.length > 0) return fallback;

            // L4: Ultimate Fallback — generate Mock Data linked to this task
            console.log(`L4 mock fallback for "${taskTitle}"`);
            const mocks = this.getMockYouTubeData(`${taskTitle} ${topic}`, 2);
            const results = [];
            for (const mock of mocks) {
                const created = await prisma.content.create({
                    data: {
                        title: mock.title,
                        description: mock.description,
                        url: mock.url,
                        source: 'YouTube',
                        type: ContentType.VIDEO,
                        duration: mock.duration,
                        thumbnail: mock.thumbnail,
                        externalId: mock.externalId,
                        tags: {
                            create: {
                                tag: { connectOrCreate: { where: { name: topic }, create: { name: topic } } }
                            }
                        }
                    }
                });
                const taskTag = await prisma.tag.upsert({ where: { name: taskTitle }, update: {}, create: { name: taskTitle } });
                await prisma.contentTag.upsert({
                    where: { contentId_tagId: { contentId: created.id, tagId: taskTag.id } },
                    update: {},
                    create: { contentId: created.id, tagId: taskTag.id }
                });
                results.push(created);
            }
            return results;
        }
    }
}

