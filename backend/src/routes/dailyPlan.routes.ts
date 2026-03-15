import { Router } from 'express';
import { generateDailyPlan, getDailyPlan, toggleDailyTask } from '../controllers/dailyPlan.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/generate', generateDailyPlan);
router.get('/', getDailyPlan);
router.patch('/tasks/:taskId/toggle', toggleDailyTask);

export default router;
