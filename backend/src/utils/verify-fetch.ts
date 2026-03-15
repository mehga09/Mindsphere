import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function testYouTube() {
    console.log('Testing YouTube API Key:', YOUTUBE_API_KEY ? 'Present' : 'MISSING');
    if (!YOUTUBE_API_KEY) return;

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q: 'javascript tutorial',
                type: 'video',
                key: YOUTUBE_API_KEY,
                maxResults: 1
            }
        });
        console.log('✅ API SUCCESS!');
        console.log('Results Count:', response.data.pageInfo.totalResults);
    } catch (error: any) {
        if (error.response) {
            console.error('❌ API ERROR:', error.response.status);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ Network Error:', error.message);
        }
    }
}

testYouTube();
