const { YoutubeTranscript } = require('youtube-transcript');

async function test() {
  const videoId = "EG0LhIfmUSo"; // React beginner video
  
  console.log("Fetching transcript for:", videoId);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(t => t.text).join(' ');
    console.log("Transcript fetched. Length:", transcriptText.length);
    console.log("Preview:", transcriptText.substring(0, 200));
  } catch (err) {
    console.error("FAILED TO FETCH TRANSCRIPT:", err);
  }
}

test().finally(() => process.exit(0));
