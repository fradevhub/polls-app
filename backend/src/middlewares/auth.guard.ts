import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/* Extend Express.Request to include "user" property */
// (avoids importing the internal "express-serve-static-core" module)
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'user' | 'admin' };
    }
  }
}

// define the shape of the decoded JWT payload
type JwtPayload = { sub: string; role: 'user' | 'admin'; iat: number; exp: number };


/* Middleware: requireAuth */
// - Read the Bearer token from Authorization header
// - Verify it using JWT_SECRET
// - Attach decoded data to req.user
// - Return 401 if token is missing, invalid, or expired
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // if header is missing or incorrect: reject
  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' },
    });
  }

  try {
    // verify token and decode its payload
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Attach minimal info to req.user for later use (controllers, etc.)
    req.user = { id: decoded.sub, role: decoded.role };

    // continue to the next middleware or route handler
    return next();
  } catch {
    // on verification failures: invalid or expired token
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}