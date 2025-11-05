import { Router } from 'express';
import { getPolls, getPollDetail } from '../controllers/polls.controller';

const router = Router();

// GET /api/polls (auth required)
router.get('/', getPolls);

// GET /api/polls/:id (auth required)
router.get('/:id', getPollDetail);

export default router;