
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
     * Fetches a highly specific video based on a task title, filtering by duration, age, and ranking by views.
     */
    async fetchSpecificVideoForTask(taskTitle: string, topic: string): Promise<Content[]> {
        console.log(`Fetching specific video for task: ${taskTitle} (Topic: ${topic})`);

        // Check local DB first for an exact match
        let localContents = await prisma.content.findMany({
            where: {
                title: { contains: taskTitle, mode: 'insensitive' },
                source: 'YouTube'
            },
            take: 5
        });

        if (localContents.length >= 3) {
           return localContents;
        }

        if (!YOUTUBE_API_KEY) {
            console.warn('YOUTUBE_API_KEY not set. Using mock task data.');
            const mocks = this.getMockYouTubeData(`${taskTitle} ${topic}`, 5);
            const results = [];
            for (const mock of mocks) {
                const createdMock = await prisma.content.create({
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
                results.push(createdMock);
            }
            return results;
        }

        try {
            // Published within the last 10 years
            const publishedAfter = new Date();
            publishedAfter.setFullYear(publishedAfter.getFullYear() - 10);

            const query = `${taskTitle} tutorial`;
            
            // Search YouTube
            const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    key: YOUTUBE_API_KEY,
                    maxResults: 20, // Fetch more to allow for filtering
                    publishedAfter: publishedAfter.toISOString()
                }
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                console.log(`No YouTube search results for query: ${query}`);
                return [];
            }

            const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');

            // Get video details (contentDetails for duration, statistics for viewCount)
            const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'contentDetails,snippet,statistics',
                    id: videoIds,
                    key: YOUTUBE_API_KEY
                }
            });

            // Filter and Map
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
                // Filter duration between 1m (60s) and 120m (7200s)
                const isMatch = v.duration >= 60 && v.duration <= 7200;
                if (!isMatch) {
                    console.log(`Skipping video ${v.title} due to duration: ${Math.round(v.duration/60)} mins (${v.duration}s)`);
                }
                return isMatch;
            });

            if (validVideos.length === 0) {
                 console.log(`No videos matched duration constraints (10-120m) for task: ${taskTitle}. Found ${detailsResponse.data.items.length} total.`);
                 return localContents;
            }

            // Rank by highest viewCount
            validVideos.sort((a: any, b: any) => b.viewCount - a.viewCount);
            console.log(`Selected top ${Math.min(5, validVideos.length)} videos for ${taskTitle}`);

            const bestVideos = validVideos.slice(0, 5);
            const results = [];
            
            for (const video of bestVideos) {
                // Save to DB
                let existing = await prisma.content.findUnique({
                    where: { externalId: video.externalId }
                });

                if (existing) {
                    results.push(existing);
                } else {
                    const created = await prisma.content.create({
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
                    results.push(created);
                }
            }

            return results;

        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error('YouTube API Error in fetchSpecificVideoForTask:', error.response?.status, error.response?.data);
            } else {
                console.error('YouTube API Error in fetchSpecificVideoForTask:', error);
            }
            return localContents;
        }
    }
}
