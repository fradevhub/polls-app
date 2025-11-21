/* Exrpess and Zod */
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod';

/* App modules */
import { listPollsWithMetrics, getPollByIdWithMetrics, handleUpsertVote, handleCreatePoll, handleClosePoll } from '../services/polls.service';
import { AppError } from '../middlewares/error.middleware';

/* Body validation for POST /polls (ZOD) */
// - title: required, trimmed, 1–80 chars
// - description: optional, trimmed, "" → null, max 500 chars
const CreatePollSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title is required' })
    .max(80, { message: 'Title must be at most 80 characters' }),

  description: z
    .string()
    .trim()
    .max(500, { message: 'Description must be at most 500 characters' })
    .optional()
    .transform((s) => (s && s.length ? s : null)) // "" or undefined -> null
});

/* Body validation for POST /polls/:id/vote (ZOD) */
const voteBodySchema = z.object({
  rating: z.coerce
    .number() // coerce converts "5" (string) → 5
    .int()
    .min(1, { message: 'Rating must be an integer between 1 and 5' })
    .max(5, { message: 'Rating must be an integer between 1 and 5' })
    .refine((val) => !isNaN(val), { message: 'Rating must be a number' })
});


/* Get current user id */
// Helper to read current user id from auth context
function getCurrentUserId(req: Request): string {
  if (!req.user?.id) {
    // This should never happen unless requireAuth was skipped or misconfigured
    throw new Error('Missing authenticated user in request context');
  }
  return req.user.id;
}


/* Get current user role */
// Helper to read current user role from auth context
function getCurrentUserRole(req: Request): 'user' | 'admin' | undefined {
  return (
    (req as any)?.user?.role ??
    (req as any)?.auth?.role
  );
}


/* POLLS - USER ENDPOINT CONTROLLERS */

/* Get polls (auth required) */
// Return { items: [...] } in compliance with API contract.
export async function getPolls(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getCurrentUserId(req);
    const data = await listPollsWithMetrics(userId);
    return res.json(data);
  } catch (err) {
    return next(err); // global error handler translate to 500
  }
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


/* POLLS - ADMIN ENDPOINT CONTROLLERS */

/* Create poll (auth required) */
// Controller: POST /polls (admin only; poll is OPEN by default).
export async function createPoll(req: Request, res: Response, next: NextFunction) {
  try {
    // Check user role
    const role = getCurrentUserRole(req);
    if (role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin only');
    }

    // Validate input
    const parsed = CreatePollSchema.parse(req.body);

    // Create the poll (status enforced to OPEN inside the service)
    const authorId = getCurrentUserId(req);
    const created = await handleCreatePoll({
      title: parsed.title,
      description: parsed.description ?? null,
      createdBy: authorId
    });

    // Return created resource (201)
    // Return the new poll shape with stats initialized in compliance with API contract 
    return res
      .status(201)
      .location(`/api/polls/${created.id}`) // include location header pointing to the new poll
      .json(created);
  } catch (err: any) {
    // Map Zod validation errors to 400 with code VALIDATION_ERROR
    if (err instanceof z.ZodError) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid payload', {
          issues: err.issues, // array of issues
        })
      );
    }
    return next(err);
  }
}


// Close poll (auth required)
// Controller: POST /polls/:id/close (admin only; works only if poll is OPEN).
export async function closePoll(req: Request, res: Response, next: NextFunction) {
  try {
    // Check user role
    const role = getCurrentUserRole(req);
    if (role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin only');
    }
    const pollId = req.params.id;
    const result = await handleClosePoll(pollId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
