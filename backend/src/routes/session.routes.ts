import { Router } from 'express';
import { startSession, endSession, logEvents } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/start', authenticate, startSession);
router.post('/end', authenticate, endSession);
router.post('/events', authenticate, logEvents);

export default router;
