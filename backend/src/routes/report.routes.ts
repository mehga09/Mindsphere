import { Router } from 'express';
import { getLatestReport } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/latest', authenticate, getLatestReport);

export default router;
