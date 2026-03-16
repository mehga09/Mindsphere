import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';

// Default model for text generation
const MODEL_NAME = 'gemini-2.0-flash-lite';

export class LlmService {
    
    // Get the API key safely at runtime, after dotenv is loaded
    private get apiKey(): string {
       return process.env.GEMINI_API_KEY || '';
    }

    private get genAI(): GoogleGenerativeAI {
       return new GoogleGenerativeAI(this.apiKey);
    }
    
    /**
     * Generates a curriculum array of sub-topics
     */
    async generateCurriculum(topic: string, difficulty: string, days: number): Promise<string[]> {
        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not set. Falling back to simple curriculum mock.');
            return this.getMockCurriculum(topic, difficulty, days);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Act as an expert tutor. Create a strict ${days}-day study curriculum for a ${difficulty} level student learning "${topic}".
                Return ONLY a JSON array of strings containing the sub-topics for each day.
                Do not include any string formatting like \`\`\`json or \`\`\`.
                Example format: ["Introduction to concept", "Basic installation", ...]
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            
            // Try to parse the response as JSON
            try {
                // Remove potential markdown formatting if the LLM includes it despite instructions
                const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const curriculum = JSON.parse(cleanJson);
                
                if (Array.isArray(curriculum) && curriculum.length > 0) {
                    // Ensure the length matches `days` (pad or truncate if necessary)
                    let finalCurriculum = curriculum.slice(0, days);
                    while (finalCurriculum.length < days) {
                        finalCurriculum.push(`Continued Practice: ${topic}`);
                    }
                    return finalCurriculum;
                }
            } catch (parseError) {
                console.error('Failed to parse LLM curriculum response as JSON:', responseText, parseError);
            }

            return this.getMockCurriculum(topic, difficulty, days);

        } catch (error) {
            console.error('Error generating curriculum from LLM:', error);
            return this.getMockCurriculum(topic, difficulty, days);
        }
    }

    /**
     * Starts an interactive chat session with context and history
     */
    async chat(history: any[], message: string, systemContext?: string): Promise<string> {
        if (!this.apiKey) {
            return "GEMINI_API_KEY is not set. I am a mock AI assistant. How can I help you today?";
        }

        try {
            // Using gemini-2.0-flash which supports tools/history well
            const model = this.genAI.getGenerativeModel({ 
                model: MODEL_NAME,
                systemInstruction: systemContext || "You are an expert tutor and AI Learning Assistant for MindSphere. Provide helpful, concise, and accurate answers to help the learner."
            });

            // Format history for Gemini
            // Gemini expects { role: 'user' | 'model', parts: [{ text: string }] }
            const formattedHistory = history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user', // map to standard gemini roles
                parts: [{ text: msg.content }]
            }));

            // Gemini requires the first history entry to be 'user', never 'model'.
            // The chatbot's initial greeting shows as 'model' — drop leading model turns.
            while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
                formattedHistory.shift();
            }

            const chat = model.startChat({
                history: formattedHistory,
            });

            const result = await chat.sendMessage(message);
            return result.response.text();
        } catch (error: any) {
            console.error('Error generating chat response:', error);
            if (error?.status === 429) {
                return "I'm receiving too many requests right now. Please wait a moment and try again.";
            }
            return "I apologize, but I encountered an error processing your request. Please try again.";
        }
    }

    /**
     * Generates a context-aware hint for a practice problem/task
     */
    async generateHint(topic: string, specificContext: string): Promise<string> {
        if (!this.apiKey) {
            return `Here is a mock hint for ${topic}: Try breaking the problem down into smaller steps.`;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Act as an expert tutor. A student is stuck on a task related to "${topic}".
                Specific context or question they are working on: "${specificContext}".
                
                Provide a single, short, encouraging hint (1-3 sentences maximum).
                CRITICAL: NEVER give away the direct answer. Just nudge them in the right direction or suggest a concept to review.
            `;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('Error generating hint:', error);
            return `Try reviewing the fundamental principles of ${topic}.`;
        }
    }

    /**
     * Generates a list of to-do tasks for a given topic
     */
    async generateLearningTasks(topic: string, difficulty: string): Promise<string[]> {
        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not set. Returning mock tasks.');
            return [
                `Introduction to ${topic}`,
                `Install ${topic} Development Environment`,
                `${topic} Variables and Data Types`,
                `Control Flow in ${topic}`,
                `Core Concepts of ${topic}`,
                `Build Your First ${topic} Program`,
                `Practice ${topic} Coding Problems`
            ];
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Generate a structured beginner learning roadmap for the topic "${topic}".
                
                Requirements:
                • Generate 6 to 8 learning tasks
                • Tasks must be ordered from beginner to intermediate
                • Each task should represent a specific learning milestone
                • Tasks should be short titles
                
                Return ONLY a JSON array.
                
                Example output:
                [
                "Introduction to Java",
                "Install Java Development Environment",
                "Java Variables and Data Types",
                "Control Flow in Java",
                "Object Oriented Programming in Java",
                "Build Your First Java Program",
                "Practice Java Coding Problems"
                ]
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            try {
                // Remove potential markdown formatting if the LLM includes it
                let cleanText = responseText.replace(/```(?:json)?/gi, '').trim();
                
                // Fallback for plain text lists if it doesn't look like JSON array
                if (!cleanText.startsWith('[')) {
                    const lines = cleanText.split('\n')
                        .map(line => line.replace(/^[\d\-\*\.]+\s*/, '').replace(/"/g, '').trim())
                        .filter(line => line.length > 5); // ensure it's a real sentence
                    if (lines.length > 0) {
                        return lines.slice(0, 8);
                    }
                }

                const tasks = JSON.parse(cleanText);
                
                if (Array.isArray(tasks) && tasks.length > 0) {
                    return tasks.filter(t => typeof t === 'string' && t.trim().length > 0).slice(0, 8);
                }
            } catch (parseError) {
                console.error('Failed to parse LLM tasks response as JSON:', responseText, parseError);
            }

            return [
                `Introduction to ${topic}`,
                `Install ${topic} Development Environment`,
                `${topic} Core Concepts`,
                `Practice ${topic} Questions`,
                `Build ${topic} Project`
            ];

        } catch (error) {
            console.error('Error generating tasks from LLM:', error);
            return [
                `Introduction to ${topic}`,
                `Install ${topic} Development Environment`,
                `${topic} Variables and Data Types`,
                `Control Flow in ${topic}`,
                `Core Concepts of ${topic}`,
                `Build Your First ${topic} Program`,
                `Practice ${topic} Coding Problems`
            ];
        }
    }

    /**
     * Generates a granular daily schedule for a given topic
     */
    async generateDailySchedule(topic: string): Promise<any[]> {
        if (!this.apiKey) {
            return [
                { title: `Morning Planning & Strategy for ${topic}`, duration: 20, type: 'BREAK' },
                { title: `${topic} Fundamentals & Core Concepts`, duration: 60, type: 'STUDY' },
                { title: `Short Break`, duration: 15, type: 'BREAK' },
                { title: `${topic} Setup & Environment Configuration`, duration: 60, type: 'STUDY' },
                { title: `${topic} Variables, Data Types & Syntax`, duration: 60, type: 'STUDY' },
                { title: `Lunch Break`, duration: 45, type: 'BREAK' },
                { title: `${topic} Control Flow & Functions`, duration: 75, type: 'STUDY' },
                { title: `Short Break`, duration: 15, type: 'BREAK' },
                { title: `${topic} Object-Oriented Programming`, duration: 75, type: 'STUDY' },
                { title: `${topic} Error Handling & Debugging`, duration: 60, type: 'STUDY' },
                { title: `Short Break`, duration: 15, type: 'BREAK' },
                { title: `${topic} Advanced Patterns & Best Practices`, duration: 75, type: 'STUDY' },
                { title: `Build Your First ${topic} Project`, duration: 75, type: 'STUDY' },
                { title: `Final Review & Mission Debrief`, duration: 30, type: 'BREAK' },
            ];
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
Act as a world-class learning coach. Create a comprehensive, single-day study schedule for the topic: "${topic}".
The schedule MUST fit between 09:00 AM and 09:00 PM (12 hours total, 720 minutes).

HARD REQUIREMENTS:
1. Include EXACTLY 7 to 9 STUDY tasks. Not fewer. Each must be a DISTINCT sub-topic of "${topic}".
2. STUDY task titles MUST be short, specific, and searchable on YouTube (e.g., "Python List Comprehensions Tutorial", "React useEffect Hook Explained"). Avoid vague titles.
3. STUDY task durations: 45 to 90 minutes each.
4. Include 3 to 5 BREAK tasks (morning planning, short coffee breaks, lunch, final review). Each 15 to 60 minutes.
5. The SUM of all durations MUST equal exactly 720 minutes.
6. Order tasks logically: beginner topics first, advanced topics later.
7. Return ONLY a valid JSON array with no markdown or extra text.

JSON structure:
[
  { "title": "string", "duration": number, "type": "STUDY" | "BREAK" }
]

Example for topic "Python":
[
  { "title": "Morning Planning & Python Roadmap", "duration": 20, "type": "BREAK" },
  { "title": "Python Basics: Variables and Data Types", "duration": 60, "type": "STUDY" },
  { "title": "Python Control Flow: If Else and Loops", "duration": 60, "type": "STUDY" },
  { "title": "Short Break", "duration": 15, "type": "BREAK" },
  { "title": "Python Functions and Scope", "duration": 60, "type": "STUDY" },
  { "title": "Lunch Break", "duration": 45, "type": "BREAK" },
  { "title": "Python Object Oriented Programming", "duration": 75, "type": "STUDY" },
  { "title": "Python File Handling and Exceptions", "duration": 60, "type": "STUDY" },
  { "title": "Short Break", "duration": 15, "type": "BREAK" },
  { "title": "Python List Comprehensions and Generators", "duration": 60, "type": "STUDY" },
  { "title": "Python Modules and Packages", "duration": 60, "type": "STUDY" },
  { "title": "Short Break", "duration": 15, "type": "BREAK" },
  { "title": "Build a Python Project from Scratch", "duration": 75, "type": "STUDY" },
  { "title": "Final Review and Mission Debrief", "duration": 20, "type": "BREAK" }
]
Now generate the schedule for "${topic}":
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const schedule = JSON.parse(cleanJson);
            
            if (Array.isArray(schedule) && schedule.length >= 7) {
                return schedule;
            }

            // If parsed but too few items, still return what we have
            if (Array.isArray(schedule) && schedule.length > 0) {
                return schedule;
            }
        } catch (error) {
            console.error('Error generating daily schedule:', error);
        }

        // Rich fallback with 9 study tasks
        return [
            { title: `Morning Planning & Strategy for ${topic}`, duration: 20, type: 'BREAK' },
            { title: `${topic} Fundamentals and Core Concepts`, duration: 60, type: 'STUDY' },
            { title: `${topic} Setup and Environment Configuration`, duration: 60, type: 'STUDY' },
            { title: `Short Break`, duration: 15, type: 'BREAK' },
            { title: `${topic} Variables, Data Types and Syntax`, duration: 60, type: 'STUDY' },
            { title: `${topic} Control Flow and Functions`, duration: 75, type: 'STUDY' },
            { title: `Lunch Break`, duration: 45, type: 'BREAK' },
            { title: `${topic} Object Oriented Programming`, duration: 75, type: 'STUDY' },
            { title: `${topic} Error Handling and Debugging`, duration: 60, type: 'STUDY' },
            { title: `Short Break`, duration: 15, type: 'BREAK' },
            { title: `${topic} Advanced Patterns and Best Practices`, duration: 75, type: 'STUDY' },
            { title: `Build a Complete ${topic} Project`, duration: 75, type: 'STUDY' },
            { title: `Final Review and Mission Debrief`, duration: 25, type: 'BREAK' },
        ];
    }

    /**
     * Generates an ordered list of 6-8 sub-topics for a course roadmap
     */
    async generateCourseRoadmap(topic: string): Promise<any[]> {
        if (!this.apiKey) {
            return [
                { topicName: `Introduction to ${topic}`, description: `Basics and fundamentals of ${topic}`, estimatedDays: 1 },
                { topicName: `${topic} Setup & Hello World`, description: `Setting up the workspace`, estimatedDays: 1 },
                { topicName: `${topic} Core Concepts`, description: `Variables, syntax and rules`, estimatedDays: 2 },
                { topicName: `Building static components with ${topic}`, description: `Applying core concepts to a project`, estimatedDays: 1 },
                { topicName: `${topic} Functions and Logic`, description: `Control flow and data structures`, estimatedDays: 2 },
                { topicName: `Advanced ${topic}`, description: `Optimization and patterns`, estimatedDays: 2 },
                { topicName: `${topic} Final Project`, description: `Build a complete application`, estimatedDays: 3 },
            ];
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
Act as an expert curriculum designer. Create a COMPREHENSIVE, deep learning roadmap for the course topic: "${topic}".
Ensure it covers all phases from absolute beginner fundamentals up through advanced architectures, backend/databases (if applicable), and final deployment.
You MUST provide a robust list of at least 10 to 15 distinct, granular sub-topics so the course has rich depth and does not end prematurely.
Return ONLY a JSON array of sub-topics, ordered from beginner to advanced.
Do not include any string formatting like \`\`\`json or \`\`\`.

Each item in the array MUST follow this exact structure:
{
  "topicName": "short specific topic title",
  "description": "1 sentence description of what will be learned",
  "estimatedDays": number
}

Example output structure:
[
  { "topicName": "1. HTML Basics & Document Structure", "description": "Learn layout headings and paragraphs", "estimatedDays": 1 },
  { "topicName": "2. CSS Fundamentals & Styling", "description": "Learn selectors box model and static styling", "estimatedDays": 2 },
  { "topicName": "3. JavaScript Syntax & Data Types", "description": "Learn variables operators and types", "estimatedDays": 1 },
  { "topicName": "4. JS Functions & Control Flow", "description": "Learn functions loops of logic", "estimatedDays": 2 },
  { "topicName": "5. DOM Manipulation & Events", "description": "Learn attaching handlers for dynamic UI", "estimatedDays": 2 },
  { "topicName": "6. Advanced JS & Async Await", "description": "Learn Promises and API integration", "estimatedDays": 1 },
  { "topicName": "7. React Core Concepts & Hooks", "description": "Learn building components structure", "estimatedDays": 3 }
]

Now generate the COMPREHENSIVE roadmap for "${topic}" with 6 to 7 items:
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            console.log('\n=== GEMINI RESPONSE ===\n', responseText, '\n=======================\n');
            const match = responseText.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('No JSON array found in response');
            const cleanedText = match[0].replace(/,\s*([\]}])/g, '$1');
            const roadmap = JSON.parse(cleanedText);
            
            if (Array.isArray(roadmap) && roadmap.length > 0) {
                return roadmap;
            }
        } catch (error: any) {
            try {
                const fs = require('fs');
                fs.appendFileSync('d:/Projects/mindsphere/generate_errors.txt', `\n[${new Date().toISOString()}] Error: ${error.stack || error}\n`);
            } catch (e) {}
            console.error('\n!!! ERROR GENERATING COURSE ROADMAP !!!\n', error);
        }

        const key = topic.toLowerCase().trim();
        if (key === 'web development' || key === 'web dev') {
            return [
                { topicName: 'HTML Basics', description: 'HTML syntax and page structures', estimatedDays: 1 },
                { topicName: 'CSS Fundamentals', description: 'Layouts and aesthetic designs', estimatedDays: 2 },
                { topicName: 'JavaScript logic', description: 'Variables, loops and types setup', estimatedDays: 1 },
                { topicName: 'DOM Manipulation', description: 'Attaching handlers for dynamic UI triggers', estimatedDays: 2 },
                { topicName: 'Advanced JS & Async', description: 'Promises, APIs and fetch calls securely', estimatedDays: 2 },
                { topicName: 'React Components', description: 'Modular framework building systems', estimatedDays: 2 },
                { topicName: 'React State & Hooks', description: 'Managing reactive context and effect triggers', estimatedDays: 3 }
            ];
        }

        return [
            { topicName: `Introduction to ${topic}`, description: `Basics and fundamentals of ${topic}`, estimatedDays: 1 },
            { topicName: `${topic} Setup & Configuration`, description: `Environment setup`, estimatedDays: 1 },
            { topicName: `${topic} Core Syntax`, description: `Variables and logic`, estimatedDays: 2 },
            { topicName: `${topic} Functions`, description: `Building modular elements`, estimatedDays: 1 },
            { topicName: `${topic} Projects`, description: `Putting it all together`, estimatedDays: 3 },
        ];
    }

    /**
     * Generates a daily schedule combining primary and review topics
     */
    async generateAdaptiveDaySchedule(primaryTopic: string, reviewTopics: string[], dayNumber: number): Promise<any[]> {
        if (!this.apiKey) {
            return this.generateDailySchedule(primaryTopic); // fallback
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
Act as a world-class learning coach. Create a comprehensive, single-day study schedule representing Day ${dayNumber} of a larger course.
The schedule MUST fit between 09:00 AM and 09:00 PM (12 hours total, 720 minutes).

Focus areas for today:
1. Primary Topic To Learn: "${primaryTopic}" (Allocate 70-80% of STUDY time)
2. Review/Weak Topics (Carryover): [${reviewTopics.join(', ')}] (Allocate 20-30% of STUDY time to reinforce these)

HARD REQUIREMENTS:
1. Include EXACTLY 7 to 9 STUDY tasks. 
2. At least 1-2 tasks MUST be specifically focused on Reviewing the weak topics listed above.
3. STUDY task titles MUST be short, specific, and searchable on YouTube.
4. STUDY task durations: 45 to 90 minutes each.
5. Include 3 to 5 BREAK tasks (morning planning, lunch, coffee, review).
6. The SUM of all task durations MUST equal exactly 720 minutes.
7. Return ONLY a valid JSON array with no markdown or extra text.

JSON structure:
[
  { "title": "string", "duration": number, "type": "STUDY" | "BREAK" }
]

Now generate the adaptive schedule:
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            const match = responseText.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('No JSON array found in response');
            const schedule = JSON.parse(match[0]);
            
            if (Array.isArray(schedule) && schedule.length >= 5) {
                return schedule;
            }
        } catch (error) {
            console.error('Error generating adaptive schedule:', error);
        }

        return this.generateDailySchedule(primaryTopic); // rich fallback
    }

    /**
     * Generates a multiple-choice quiz based on content title and description
     */
    async generateQuiz(contentTitle: string, contentExternalId: string | null, contentDescription: string, numQuestions: number = 5): Promise<any[]> {
        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not set. Returning a mock quiz.');
            return this.getMockQuiz(contentTitle, numQuestions);
        }

        let transcriptText = '';
        if (contentExternalId) {
            try {
                console.log(`[QuizGen] Fetching transcript for ${contentExternalId}...`);
                const transcript = await YoutubeTranscript.fetchTranscript(contentExternalId);
                transcriptText = transcript.map(t => t.text).join(' ');
                console.log(`[QuizGen] Transcript loaded! Length: ${transcriptText.length}`);
                
                if (transcriptText.length > 50000) {
                    transcriptText = transcriptText.substring(0, 50000);
                }
            } catch (err) {
                console.error(`[QuizGen] Failed to fetch transcript for video ${contentExternalId}:`, err);
            }
        } else {
            console.log(`[QuizGen] No external ID provided for title: ${contentTitle}`);
        }

        try {
            console.log(`[QuizGen] Calling GROK LLM with transcript (length=${transcriptText.length})`);
            const grokApiKey = process.env.GROK_API_KEY;
            
            if (!grokApiKey) {
                throw new Error("GROK_API_KEY is missing from environment variables.");
            }

            const prompt = `
                Act as an expert coding instructor creating a rigorous, real-world assessment.
                Create EXACTLY ${numQuestions} in-depth multiple-choice questions specifically testing the deep technical knowledge presented in the following video content.
                
                Video Title: "${contentTitle}"
                Video Description: "${contentDescription}"
                ${transcriptText ? `\nVideo Transcript (excerpt):\n"""\n${transcriptText}\n"""\n` : ''}

                CRITICAL INSTRUCTIONS FOR QUESTIONS AND OPTIONS:
                1. The questions MUST test specific syntax, real code snippets, patterns, or architecture decisions discussed in the transcript or inferred from the topic.
                2. DO NOT ask generic or trivial questions. Give them actual code to read and analyze.
                3. Use markdown block formatting for code (e.g. \`\`\`javascript \\n code... \\n\`\`\`) inside the 'question' string and 'options' strings if necessary. Use \`inline code\` for technical terms.
                4. Generate exactly 4 distinct, detailed options per question.
                5. EXACTLY ONE option is correct. The other 3 must be plausible, realistic distractors related to the specific code or topic.
                6. The \`correctIndex\` must be the exact integer index (0-3) of the correct option in the options array.

                FORMAT REQUIREMENTS:
                Return ONLY a strict JSON array of question objects. Do NOT wrap it in markdown block quotes (like \`\`\`json). Just return the raw JSON starting with [ and ending with ].
                The JSON MUST follow this exact structure:
                [
                    {
                        "question": "What is the output of the following code snippet?\\n\\n\`\`\`javascript\\nconsole.log(typeof null);\\n\`\`\`",
                        "options": ["\`undefined\`", "\`null\`", "\`object\`", "\`string\`"],
                        "correctIndex": 2,
                        "explanation": "In JavaScript, the \`typeof\` operator returns 'object' for \`null\`. As explained in the video..."
                    }
                ]
            `;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${grokApiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are an expert coding instructor. Ensure you output ONLY a valid JSON array, strictly following the required schema, with NO markdown formatting around the output." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const responseText = data.choices[0]?.message?.content?.trim() || '';

            try {
                // Remove potential markdown formatting if the LLM includes it despite instructions
                const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
                const cleanJson = jsonMatch ? jsonMatch[0] : responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const quiz = JSON.parse(cleanJson);
                
                if (Array.isArray(quiz) && quiz.length > 0) {
                    // Ensure we don't return more than requested
                    return quiz.slice(0, numQuestions);
                }
            } catch (parseError) {
                console.error('[QuizGen] Failed to parse LLM quiz response as JSON:', parseError);
                console.error('[QuizGen] Raw LLM Response was:', responseText);
            }

            return this.getMockQuiz(contentTitle, numQuestions);

        } catch (error) {
            console.error('[QuizGen] Error generating quiz from GROK:', error);
            return this.getMockQuiz(contentTitle, numQuestions);
        }
    }

    /**
     * Generates 2 practice exercises for a given task topic
     */
    async generatePracticeExercises(taskTitle: string): Promise<string[]> {
        if (!this.apiKey) {
            return [
                `Write a short summary of what you learned about "${taskTitle}".`,
                `Build a mini-example implementing the core concepts of "${taskTitle}".`
            ];
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Generate 2 beginner-friendly, practical learning exercises for the topic: "${taskTitle}".
                The exercises should be actionable and help reinforce the learning milestone.
                Return ONLY a JSON array of 2 strings.
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            try {
                const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const exercises = JSON.parse(cleanJson);
                if (Array.isArray(exercises)) return exercises.slice(0, 2);
            } catch (e) {
                // Fallback to line splitting
                return responseText.split('\n')
                    .map(l => l.replace(/^[\d\-\*\.]+\s*/, '').trim())
                    .filter(l => l.length > 5)
                    .slice(0, 2);
            }
        } catch (error) {
            console.error('Error generating exercises:', error);
        }

        return [
            `Practice the core concepts of ${taskTitle}.`,
            `Build a small project using ${taskTitle}.`
        ];
    }

    /**
     * Generates a milestone project idea for a given topic
     */
    async generateMilestoneProject(topic: string): Promise<string> {
        if (!this.apiKey) {
            return `Build a comprehensive application using ${topic}.`;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Generate a specific, actionable milestone project idea for the topic: "${topic}".
                The project should be challenging enough to apply all core concepts learned.
                Return ONLY a 1-2 sentence project description.
            `;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('Error generating milestone project:', error);
            return `Build a final project demonstrating your ${topic} skills.`;
        }
    }

    /**
     * Generates 5 quiz questions for a topic (without specific video context)
     */
    async generateComprehensiveQuiz(topic: string): Promise<any[]> {
        if (!this.apiKey) {
            return this.getMockQuiz(topic, 5);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Generate 5 comprehensive multiple-choice questions for the topic: "${topic}".
                Include options and a correct index. Return ONLY JSON array.
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error('Error generating comprehensive quiz:', error);
            return this.getMockQuiz(topic, 5);
        }
    }

    private getMockCurriculum(topic: string, difficulty: string, days: number): string[] {
        const mock = [];
        for (let i = 0; i < days; i++) {
            if (i === 0) mock.push(`Introduction & Basics of ${topic}`);
            else if (i === 1) mock.push(`Environment Setup & Tooling`);
            else mock.push(`Core Concepts & Practice (${i + 1}/${days})`);
        }
        return mock;
    }

    private getMockQuiz(contentTitle: string, numQuestions: number): any[] {
        // Generic questions that can be customized based on content
        const allQuestions = [
            {
                question: `What is the main topic covered in "${contentTitle}"?`,
                options: [
                    'Basic concepts and fundamentals',
                    'Advanced techniques and best practices',
                    'Project setup and configuration',
                    'Troubleshooting and debugging'
                ],
                correctIndex: 0,
                explanation: 'This video primarily focuses on introducing the fundamental concepts.'
            },
            {
                question: 'Which of the following is a key takeaway from this content?',
                options: [
                    'Understanding the core principles',
                    'Memorizing syntax',
                    'Copying code examples',
                    'Skipping documentation'
                ],
                correctIndex: 0,
                explanation: 'The most important aspect is understanding the underlying principles, not just memorizing code.'
            },
            {
                question: 'What should you do after watching this content?',
                options: [
                    'Move to the next video immediately',
                    'Practice the concepts with hands-on exercises',
                    'Forget about it',
                    'Watch it again without practicing'
                ],
                correctIndex: 1,
                explanation: 'Hands-on practice is essential for reinforcing what you\'ve learned.'
            },
            {
                question: 'How would you rate the difficulty level of this content?',
                options: [
                    'Beginner-friendly',
                    'Intermediate',
                    'Advanced',
                    'Expert level'
                ],
                correctIndex: 0,
                explanation: `This content is designed as an introductory guide.`
            },
            {
                question: 'What is the best way to retain information from this content?',
                options: [
                    'Take notes and create summaries',
                    'Watch it multiple times passively',
                    'Skip to the end',
                    'Only watch the introduction'
                ],
                correctIndex: 0,
                explanation: 'Active learning through note-taking and summarization significantly improves retention.'
            }
        ];

        // Ensure we only return the requested number of questions
        return allQuestions.slice(0, numQuestions);
    }
}
