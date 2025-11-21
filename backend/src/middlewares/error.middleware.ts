/* Express */
import { Request, Response, NextFunction } from 'express';

/* Type for error codes used throughout the API */
// Useful to keep consistent and predictable error responses.
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL';

/* Custom error class (extending native JavaScript Error */
// Include additional properties like HTTP status code and error code.
export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message); // call parent constructor (Error)
    this.status = status;
    this.code = code;
    this.details = details;
  }
}


/* Handling 404 (Not Found) routes */
// Create new AppError if no previous route matched
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
}


/* Global error handling */
// Catch all errors by routes or other middleware
// and send JSON response to the client.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // if the error is an instance of AppError, format and return it
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null // optional debugging info
      }
    });
  }

  // log unexpected errors for debugging
  console.error('[UnhandledError]', err);

  // return generic 500 response for unknown errors
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}
