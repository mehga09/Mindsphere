import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Fast, free-tier friendly model on Groq

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class GrokService {
  private get apiKey(): string {
    return process.env.GROK_API_KEY || '';
  }

  async chat(history: any[], message: string, systemContext?: string): Promise<string> {
    if (!this.apiKey) {
      return "GROK_API_KEY is not set. Please add your Groq API key to the .env file.";
    }

    try {
      // Build messages: system prompt + filtered history + current message
      const firstUserIdx = history.findIndex(m => m.role === 'user');

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemContext || 'You are an expert tutor and AI Learning Assistant for MindSphere. Provide helpful, concise, and accurate answers to help the learner.'
        },
        ...history
          .slice(firstUserIdx >= 0 ? firstUserIdx : history.length) // drop leading assistant messages
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
        { role: 'user', content: message }
      ];

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0]?.message?.content || 'No response generated.';
    } catch (error: any) {
      console.error('Error generating Groq chat response:', error?.response?.data || error.message);

      if (error?.response?.status === 429) {
        return "I'm receiving too many requests right now. Please wait a moment and try again.";
      }
      if (error?.response?.status === 401) {
        return "Groq API key is invalid or expired. Please check your GROK_API_KEY in .env.";
      }
      return "I apologize, but I encountered an error processing your request. Please try again.";
    }
  }
}
