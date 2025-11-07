/* JWT */
import jwt from 'jsonwebtoken';

/* App modules */
import { env } from '../config/env';

type Role = 'user' | 'admin';

/* Sign JWT token */
export function signAccessToken(sub: string, role: Role) {
  // iat/exp handled by library; "60m" as per API contract suggestion
  return jwt.sign({ sub, role }, env.JWT_SECRET, { expiresIn: '60m' });
}