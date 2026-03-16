import { Router } from 'express';
import { chatHandler, hintHandler } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/chat', chatHandler);
router.post('/hint', hintHandler);

export default router;
