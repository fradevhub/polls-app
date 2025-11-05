import { Router } from 'express';
import { getPolls, getPollDetail, upsertVote } from '../controllers/polls.controller';

const router = Router();

// GET /api/polls (auth required)
router.get('/', getPolls);

// GET /api/polls/:id (auth required)
router.get('/:id', getPollDetail);

// POST /api/polls/:id/vote (auth required)
// Create/update user's vote (upsert)
router.post('/:id/vote', upsertVote);

export default router;