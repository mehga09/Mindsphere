import { LlmService } from './services/llm.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    console.log('API KEY PRESET:', !!process.env.GEMINI_API_KEY);
    const service = new LlmService();
    try {
        const res = await service.generateCourseRoadmap('Machine Learning');
        console.log('\n=== GENERATED ROADMAP ===\n');
        console.dir(res, { depth: null });
        console.log('\nCOUNT:', res.length);
    } catch (err) {
        console.error('\nCRASH EXCEPTION:\n', err);
    }
}

run();
