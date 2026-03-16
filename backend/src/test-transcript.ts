const { LlmService } = require('./services/llm.service');
const { YoutubeTranscript } = require('youtube-transcript');

async function test() {
  const llm = new LlmService();
  const videoId = "EG0LhIfmUSo"; // React beginner video
  
  console.log("Fetching transcript for:", videoId);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((t: any) => t.text).join(' ');
    console.log("Transcript fetched. Length:", transcriptText.length);
    console.log("Preview:", transcriptText.substring(0, 200));
    
    console.log("Generating quiz...");
    const quiz = await llm.generateQuiz("React Tutorial", videoId, "React JS for beginners");
    console.log("QUIZ:", JSON.stringify(quiz, null, 2));
    
  } catch (err) {
    console.error("FAILED ERROR:", err);
  }
}

test().finally(() => process.exit(0));
