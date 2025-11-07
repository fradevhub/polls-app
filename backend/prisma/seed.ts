/* eslint-disable no-console */

// Seed for "Polls App"
// - Creates: 1 admin, 3 users
// - Creates: 3 polls (2 OPEN, 1 CLOSED)
// - Creates: votes consistent with API contract (unique user+poll, rating 1-5)

/* Prisma */
import { PrismaClient } from '@prisma/client';

/* Bcrypt */
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Hash password
async function hash(pwd: string) {
  return bcrypt.hash(pwd, 10);
}


async function main() {
  // Seed Users
  const [adminPwd, u1Pwd, u2Pwd, u3Pwd] = await Promise.all([
    hash('Admin!123'),
    hash('User1!123'),
    hash('User2!123'),
    hash('User3!123')
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@polls.local' },
    update: {},
    create: {
      email: 'admin@polls.local',
      passwordHash: adminPwd,
      role: 'admin'
    }
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@polls.local' },
    update: {},
    create: {
      email: 'user1@polls.local',
      passwordHash: u1Pwd,
      role: 'user'
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@polls.local' },
    update: {},
    create: {
      email: 'user2@polls.local',
      passwordHash: u2Pwd,
      role: 'user'
    }
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'user3@polls.local' },
    update: {},
    create: {
      email: 'user3@polls.local',
      passwordHash: u3Pwd,
      role: 'user'
    }
  });


  // Wipe polls (votes are deleted by cascade)
  // Security implementation if not prisma:reset is done
  await prisma.poll.deleteMany({});
  console.log('[Seed] Existing polls wiped (cascade votes deleted)');


  // Seed Polls (created by admin)
  const pollReading = await prisma.poll.create({
    data: {
      title: 'Lettura',
      description: 'Quanto spesso leggi libri durante l\'anno?',
      status: 'OPEN',
      createdBy: admin.id
    }
  });

  const pollMusic = await prisma.poll.create({
    data: {
      title: 'Musica',
      description: 'Ascolti spesso musica durante il giorno?',
      status: 'OPEN',
      createdBy: admin.id
    }
  });

  const pollCinema = await prisma.poll.create({
    data: {
      title: 'Cinema',
      description: null, // test nullable option
      // no status to test default option (OPEN)
      createdBy: admin.id
    }
  });


  // Seed Votes (ratings 1-5; unique user+poll)

  // Reading: 3 votes
  await prisma.vote.createMany({
    data: [
      { pollId: pollReading.id, userId: user1.id, rating: 5 },
      { pollId: pollReading.id, userId: user2.id, rating: 4 },
      { pollId: pollReading.id, userId: user3.id, rating: 4 }
    ],
    skipDuplicates: true
  });

  // Music: 3 votes
  await prisma.vote.createMany({
    data: [
      { pollId: pollMusic.id, userId: user1.id, rating: 3 },
      { pollId: pollMusic.id, userId: user2.id, rating: 4 },
      { pollId: pollMusic.id, userId: user3.id, rating: 4 }
    ],
    skipDuplicates: true
  });

  // Cinema: 2 votes
  await prisma.vote.createMany({
    data: [
      { pollId: pollCinema.id, userId: user1.id, rating: 5 },
      { pollId: pollCinema.id, userId: user2.id, rating: 3 }
    ],
    skipDuplicates: true
  });

  // Close Music poll to test 403 on voting
  await prisma.poll.update({
    where: { id: pollMusic.id },
    data: { status: 'CLOSED' }
  });

  // Optional: show quick aggregates (avg/count/dist) in console
  const aggregates = await prisma.poll.findMany({
    select: {
      title: true,
      status: true,
      _count: { select: { votes: true } },
      votes: { select: { rating: true } }
    },
    orderBy: { createdAt: 'asc' } // enhanced by the index on createdAt
  });

  for (const p of aggregates) {
    // avg
    const sum = p.votes.reduce((acc, v) => acc + v.rating, 0);
    const avg = p.votes.length ? sum / p.votes.length : 0;

    // distribution: counts for 1-5
    const dist = [0, 0, 0, 0, 0]; // index 0 -> 1★, ..., index 4 -> 5★
    for (const v of p.votes) {
      if (v.rating >= 1 && v.rating <= 5) dist[v.rating - 1]++;
    }

    // mini-istogramma testuale
    const distBars = dist
      .map((c, i) => `${i + 1}★ ${'▇'.repeat(Math.min(c, 20))} ${c}`)
      .join(' | ');

    console.log(
      `[Seed] ${p.title} (${p.status}) -> count=${p._count.votes}, avg=${avg.toFixed(2)}`
    );
    console.log(
      `[Seed] ${p.title} dist | ${distBars}`
    );
    console.log(''); // space for better readability
  }


  console.log(
    `[Seed] Admin login -> email=admin@polls.local, password=Admin!123`,
  );
  console.log(
    `[Seed] Users login -> user1@polls.local / user2@polls.local / user3@polls.local (pwd=UserX!123)`,
  );
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });