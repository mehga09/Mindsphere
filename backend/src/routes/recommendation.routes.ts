import { Router } from 'express';
import { fetchRecommendations } from '../controllers/recommendation.controller';

const router = Router();

router.get('/', fetchRecommendations);

export default router;
