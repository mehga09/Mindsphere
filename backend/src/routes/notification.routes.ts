import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { subscribe, sendNotification } from '../controllers/notification.controller';

const router = Router();

router.post('/subscribe', authenticate, subscribe);
router.post('/email', authenticate, sendNotification);
export default router;
