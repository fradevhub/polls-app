import { Router } from 'express';
import { getPolls } from '../controllers/polls.controller';

const router = Router();

// GET /api/polls  (auth required)
router.get('/', getPolls);

export default router;