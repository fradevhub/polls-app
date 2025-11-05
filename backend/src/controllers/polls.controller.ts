import { Request, Response, NextFunction } from 'express'
import { z } from 'zod';
import { listPollsWithMetrics, getPollByIdWithMetrics, handleUpsertVote } from '../services/polls.service';
import { AppError } from '../middlewares/error.middleware';

/* Get polls (auth required) */
// Return { items: [...] } in compliance with API contract.
export async function getPolls(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listPollsWithMetrics();
    return res.json(data);
  } catch (err) {
    return next(err); // global error handler translate to 500
  }
}


/* Get current user id */
// Extracts authenticated user id safely from req.user (set by requireAuth middleware)
function getCurrentUserId(req: Request): string {
  if (!req.user?.id) {
    // This should never happen unless requireAuth was skipped or misconfigured
    throw new Error('Missing authenticated user in request context');
  }
  return req.user.id;
}


/* Get poll detail (auth required) */
// Return poll detail with metrics and the current user's vote (if already expressed).
// Return shape in compliance with API contract.
export async function getPollDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const pollId = req.params.id;
    const userId = getCurrentUserId(req);
    const data = await getPollByIdWithMetrics(pollId, userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}


// Body validation for POST /polls/:id/vote
const voteBodySchema = z.object({
  rating: z.coerce
    .number() // coerce converts "4" (string) → 4
    .int()
    .min(1, { message: 'Rating must be an integer between 1 and 5' })
    .max(5, { message: 'Rating must be an integer between 1 and 5' })
    .refine((val) => !isNaN(val), { message: 'Rating must be a number' }),
});


/* Upsert vote (auth required) */
// Create or update (upsert) the current user's vote on a poll.
// Return 400 VALIDATION_ERROR for invalid rating.
export async function upsertVote(req: Request, res: Response, next: NextFunction) {
  try {
    const pollId = req.params.id;
    const userId = getCurrentUserId(req);

    // Parse and validate request body
    // (friendly error messages are thrown by zod on invalid data)
    const { rating } = voteBodySchema.parse(req.body);

    const result = await handleUpsertVote({ pollId, userId, rating });

    // success shape in compliance with API contract
    return res.status(200).json(result);
  } catch (err: any) {
    // map Zod errors
    if (err?.name === 'ZodError') {
      return next(new AppError(400, 'VALIDATION_ERROR', err.errors?.[0]?.message ?? 'Invalid input'));
    }
    return next(err);
  }
}