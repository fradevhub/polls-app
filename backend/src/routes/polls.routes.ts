import { Router } from 'express';
import { createPoll, getPolls, getPollDetail, upsertVote } from '../controllers/polls.controller';

const router = Router();


/* POLLS - USER ENDPOINTS (auth required) */

// GET /api/polls
router.get('/', getPolls);

// GET /api/polls/:id
router.get('/:id', getPollDetail);

// POST /api/polls/:id/vote
// Create/update user's vote (upsert)
router.post('/:id/vote', upsertVote);


/* POLLS - ADMIN ENDPOINTS (auth required - admin only) */

// POST /polls
// Creates a new poll (OPEN by default)
router.post('/', createPoll);


export default router;