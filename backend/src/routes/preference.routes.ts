import { Router } from 'express';
import { updatePreferences } from '../controllers/preference.controller';

const router = Router();

router.put('/', updatePreferences);

export default router;
