import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';

const router = Router();

router.get('/generate/:userId', analyticsController.generateReport.bind(analyticsController));
router.get('/latest/:userId', analyticsController.getLatestReport.bind(analyticsController));

export default router;
