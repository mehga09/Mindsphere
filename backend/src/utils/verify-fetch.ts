import dotenv from 'dotenv';
import path from 'path';
// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { ContentFetcherService } from '../services/contentFetcher.service';

async function verifyFetching() {
    const fetcher = new ContentFetcherService();
    const testTask = "Next.js Introduction";
    const testTopic = "Web Development";

    console.log(`--- Testing Fetching for: ${testTask} ---`);
    try {
        const results = await fetcher.fetchSpecificVideoForTask(testTask, testTopic);
        console.log(`Results Found: ${results.length}`);
        results.forEach((r: any, i: number) => {
            console.log(`[${i+1}] Title: ${r.title}`);
            console.log(`    URL: ${r.url}`);
            console.log(`    Duration: ${r.duration}s`);
        });
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verifyFetching();
