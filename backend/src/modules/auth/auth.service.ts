import bcrypt from 'bcryptjs';
import { prisma } from '../../db';
import { signAccessToken } from '../../utils/jwt';

/* Login with email and password */
export async function loginWithEmailPassword(email: string, password: string) {
  // find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, role: true }
  });

  if (!user) {
    return { ok: false as const, status: 401, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } };
  }

  // compare password
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { ok: false as const, status: 401, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } };
  }

  // sign JWT
  const token = signAccessToken(user.id, user.role as 'user' | 'admin');

  // return only safe, public fields for the client
  return {
    ok: true as const,
    data: {
      token,
      user: { id: user.id, email: user.email, role: user.role }
    }
  };
}