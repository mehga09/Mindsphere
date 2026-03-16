import { Router } from 'express';
import { generateTasks, getTasks, toggleCompleteTask } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/generate', generateTasks);
router.get('/:planId', getTasks);
router.patch('/:taskId/complete', toggleCompleteTask);

export default router;
