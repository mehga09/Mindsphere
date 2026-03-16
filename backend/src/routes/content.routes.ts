import { Router } from 'express';
import { getContents } from '../controllers/content.controller';
import { authenticate } from '../middleware/auth';
import { fetchRecommendations, sendRecommendationEmail } from '../controllers/recommendation.controller';

const router = Router();

router.get('/', authenticate, getContents); // Catalog list
router.get('/recommendations', authenticate, fetchRecommendations); // Home feed
router.post('/recommendations/email', authenticate, sendRecommendationEmail); // Email recommendations

export default router;
