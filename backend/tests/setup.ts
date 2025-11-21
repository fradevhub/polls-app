/* Prisma */
import { PrismaClient } from '@prisma/client';

/* Bcrypt */
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Set E2E_SEED=false on .env.test to skip this minimal seed
const SHOULD_SEED = (process.env.E2E_SEED ?? 'true') !== 'false';


/* Actions to be executed before all tests */
beforeAll(async () => {
  if (!SHOULD_SEED) return;

  const email = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
  const pass  = process.env.TEST_ADMIN_PASSWORD || 'Admin!123';
  const hash  = await bcrypt.hash(pass, 10);

  // Idempotent: crea o aggiorna l'admin con la password attesa
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: 'admin' },
    create: { email, passwordHash: hash, role: 'admin' },
  });
});


/* Actions to be executed after all tests */
afterAll(async () => { await prisma.$disconnect(); });
