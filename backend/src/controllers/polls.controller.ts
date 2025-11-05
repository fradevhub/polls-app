import { Request, Response, NextFunction } from 'express';
import { listPollsWithMetrics } from '../services/polls.service';

/* getPolls */
// Require authentication (guard applied at route level).
// Return { items: [...] } in compliance with API contract.
export async function getPolls(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listPollsWithMetrics();
    return res.json(data);
  } catch (err) {
    return next(err); // global error handler translate to 500
  }
}