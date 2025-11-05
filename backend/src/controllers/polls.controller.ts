import { Request, Response, NextFunction } from 'express';
import { listPollsWithMetrics, getPollByIdWithMetrics } from '../services/polls.service';

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
// Return JSON in compliance with API contract.
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