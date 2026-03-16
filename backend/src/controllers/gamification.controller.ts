import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { GamificationService } from '../services/gamification.service';

/**
 * Gets the user's gamification profile: level, XP, current streak, and earned badges.
 */
export const getUserStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userBadges: {
                    include: { badge: true }
                },
                userChallenges: true
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            level: user.level,
            xp: user.currentXP,
            streak: user.currentStreak,
            activeThemeId: user.activeThemeId,
            badges: user.userBadges.map(ub => ub.badge),
            challenges: user.userChallenges
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Fetches all available UI themes and indicates which ones the user has unlocked.
 */
export const getThemes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const themes = await prisma.theme.findMany({
            include: {
                userThemes: {
                    where: { userId }
                }
            }
        });

        const result = themes.map(theme => ({
            ...theme,
            isUnlocked: theme.xpCost === 0 || theme.userThemes.length > 0
        }));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Unlocks a theme using XP as currency.
 */
export const unlockTheme = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { themeId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const theme = await prisma.theme.findUnique({ where: { id: themeId } });
        if (!theme) return res.status(404).json({ error: 'Theme not found' });

        // Check if already unlocked
        const existing = await prisma.userTheme.findUnique({
            where: { userId_themeId: { userId, themeId } }
        });
        if (existing) return res.status(400).json({ error: 'Theme already unlocked' });

        // Check XP balance
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.currentXP < theme.xpCost) {
            return res.status(400).json({ error: 'Insufficient XP' });
        }

        // Deduct XP and unlock
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { currentXP: { decrement: theme.xpCost } }
            }),
            prisma.userTheme.create({
                data: { userId, themeId }
            })
        ]);

        res.json({ success: true, message: 'Theme unlocked!' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Sets the active theme for the user.
 */
export const setActiveTheme = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { themeId } = req.body;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Verify ownership/unlock status
        const theme = await prisma.theme.findUnique({ where: { id: themeId } });
        if (!theme) return res.status(404).json({ error: 'Theme not found' });

        if (theme.xpCost > 0) {
            const unlocked = await prisma.userTheme.findUnique({
                where: { userId_themeId: { userId, themeId } }
            });
            if (!unlocked) return res.status(403).json({ error: 'Theme not unlocked' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { activeThemeId: themeId }
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Temp endpoint to seed badges and themes.
 */
export const seedDefaultData = async (req: Request, res: Response) => {
    try {
        await GamificationService.seed();
        
        // Seed default theme
        await prisma.theme.upsert({
            where: { name: 'Mindsphere Purple' },
            update: {},
            create: {
                name: 'Mindsphere Purple',
                xpCost: 0,
                cssConfig: {
                    primary: '#7c3aed',
                    secondary: '#4f46e5',
                    background: '#0f172a',
                    text: '#f8fafc',
                    accent: '#c026d3'
                }
            }
        });

        await prisma.theme.upsert({
            where: { name: 'Emerald Forest' },
            update: {},
            create: {
                name: 'Emerald Forest',
                xpCost: 500,
                cssConfig: {
                    primary: '#059669',
                    secondary: '#10b981',
                    background: '#064e3b',
                    text: '#ecfdf5',
                    accent: '#34d399'
                }
            }
        });

        res.json({ success: true, message: 'Seeded badges and themes' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Enrolls a user in a specific challenge.
 */
export const joinChallenge = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { challengeId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Check if challenge exists
        const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
        if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

        // Check if already joined
        const existing = await prisma.userChallenge.findUnique({
            where: { userId_challengeId: { userId, challengeId } }
        });
        if (existing) return res.status(400).json({ error: 'Already enrolled in this challenge' });

        const enrollment = await prisma.userChallenge.create({
            data: { 
                userId, 
                challengeId,
                target: 5 // Default target
            }
        });

        res.json({ success: true, enrollment });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

