import { Router } from 'express';
import { getFlaggedCases, resolveCase } from '../controllers/moderation.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/cases', authenticate, authorize(['ADMIN']), getFlaggedCases);
router.post('/cases/:id/resolve', authenticate, authorize(['ADMIN']), resolveCase);

export default router;
