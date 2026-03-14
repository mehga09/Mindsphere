import { GoogleGenerativeAI } from '@google/generative-ai';

// Default model for text generation
const MODEL_NAME = 'gemini-2.0-flash'; 

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
     * Generates a multiple-choice quiz based on content title and description
     */
    async generateQuiz(contentTitle: string, contentDescription: string, numQuestions: number = 5): Promise<any[]> {
        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not set. Returning a mock quiz.');
            return this.getMockQuiz(contentTitle, numQuestions);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

            const prompt = `
                Act as an expert teacher creating a rigorous, real-world assessment.
                Create EXACTLY ${numQuestions} multiple-choice questions specifically testing the core knowledge presented in the following video content:
                Video Title: "${contentTitle}"
                Video Description: "${contentDescription}"

                CRITICAL INSTRUCTIONS FOR OPTIONS:
                1. The questions MUST directly relate to the specific Video Title and Description provided above.
                2. Generate exactly 4 distinct, detailed options per question.
                3. EXACTLY ONE option is correct. The other 3 must be plausible, realistic distractors related to the specific topic of the video, NOT generic placeholders.
                4. Do NOT use generic options like "All of the above", "None of the above", "Option A", or "Both A and B". Make up actual, factual distractors if necessary.
                5. The \`correctIndex\` must be the exact integer index (0-3) of the correct option in the options array.
                6. Ensure the questions test real-world understanding of the video's subject matter. (Random seed: ${Math.random()})

                FORMAT REQUIREMENTS:
                Return ONLY a strict JSON array of question objects. Do NOT wrap it in markdown block quotes (like \`\`\`json). Just return the raw JSON starting with [ and ending with ].
                The JSON MUST follow this exact structure, but filled with your generated, highly-specific content:
                [
                    {
                        "question": "What specific concept or tool was discussed regarding [Topic from Video]?",
                        "options": ["Plausible Distractor 1", "Plausible Distractor 2", "Correct Detailed Answer", "Plausible Distractor 3"],
                        "correctIndex": 2,
                        "explanation": "This is correct because in the context of the video..."
                    }
                ]
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

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
                console.error('Failed to parse LLM quiz response as JSON:', responseText, parseError);
                console.error('Raw LLM Response was:', responseText);
            }

            return this.getMockQuiz(contentTitle, numQuestions);

        } catch (error) {
            console.error('Error generating quiz from LLM:', error);
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
