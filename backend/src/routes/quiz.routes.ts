import { Router } from 'express';
import { prisma } from '../db';
import { LlmService } from '../services/llm.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const llmService = new LlmService();

// GET /api/content/:id/quiz
router.get('/:id/quiz', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch content details
        const content = await prisma.content.findUnique({
            where: { id }
        });

        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        // 2. Generate new quiz via LLM
        // We'll generate 5 questions.
        const questions = await llmService.generateQuiz(content.title, content.externalId, content.description || 'General concepts of this topic.');

        // 3. Save to DB using upsert to overwrite any existing quiz for this content
        const quiz = await prisma.quiz.upsert({
            where: { contentId: id },
            update: { questions: questions },
            create: {
                contentId: id,
                questions: questions
            }
        });

        res.json(quiz);

    } catch (error) {
        console.error('Failed to get/generate quiz:', error);
        res.status(500).json({ error: 'Failed to retrieve quiz' });
    }
});

// POST /api/content/:id/quiz/submit
router.post('/:id/quiz/submit', authenticate, async (req: AuthRequest, res: any) => {
    try {
        const { id } = req.params;
        const { answers, sessionId } = req.body; // array of selected indexes

        const quiz = await prisma.quiz.findUnique({
            where: { contentId: id }
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const questions: any = quiz.questions;
        let score = 0;

        questions.forEach((q: any, index: number) => {
            if (answers[index] === q.correctIndex) {
                score++;
            }
        });

        const total = questions.length;
        const percentage = Math.round((score / total) * 100);

        // Optional: Award XP based on score
        if (req.user && percentage >= 50) {
            const xpReward = Math.round(percentage * 0.5); // 100% = 50 XP
            await prisma.user.update({
                where: { id: req.user.userId },
                data: { currentXP: { increment: xpReward } }
            });
            await prisma.xPTransaction.create({
                data: {
                    userId: req.user.userId,
                    amount: xpReward,
                    source: 'QUIZ_BONUS'
                }
            });

            // Handle Achievements/Badges
            const { GamificationService } = require('../services/gamification.service');
            const content = await prisma.content.findUnique({ where: { id } });
            if (content) {
                await GamificationService.checkQuizAchievements(req.user.userId, percentage, content.title);
            }
        }

        res.json({
            score,
            total,
            percentage,
            passed: percentage >= 50,
            answers: questions.map((q: any) => ({
                correctIndex: q.correctIndex,
                explanation: q.explanation
            }))
        });

    } catch (error) {
        console.error('Failed to submit quiz:', error);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

export default router;
