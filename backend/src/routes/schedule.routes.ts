
import { Router } from 'express';
import { generateSchedule, saveSchedule, getSchedule } from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

router.post('/generate', generateSchedule);
router.post('/', saveSchedule);
router.get('/', getSchedule);

export default router;
