import { Router } from 'express';
import { getUserStats, getThemes, unlockTheme, setActiveTheme, seedDefaultData, joinChallenge } from '../controllers/gamification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, getUserStats);
router.get('/themes', authenticate, getThemes);
router.post('/themes/:themeId/unlock', authenticate, unlockTheme);
router.post('/themes/active', authenticate, setActiveTheme);
router.post('/challenges/:challengeId/join', authenticate, joinChallenge);
router.post('/seed', seedDefaultData); // Internal/Dev use

export default router;
