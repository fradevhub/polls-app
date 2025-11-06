import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginWithEmailPassword } from './auth.service';

const loginSchema = z.object({
  // @ts-ignore false positive: not related to Request.email
  email: z.string().email(),
  password: z.string().min(1)
});

/* Login controller */
export async function loginController(req: Request, res: Response, _next: NextFunction) {
  // validate body
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
    });
  }

  const { email, password } = parsed.data;

  const result = await loginWithEmailPassword(email, password);
  
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json(result.data);
}