import { Router } from 'express';
import { getProfile } from '../controllers/profile.controller';
import { updatePreferences } from '../controllers/preference.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getProfile);
router.put('/preferences', authenticate, updatePreferences);

export default router;
