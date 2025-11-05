import { prisma } from '../db';
import { AppError } from '../middlewares/error.middleware';

// Type for createPoll input
type CreatePollInput = {
  title: string;
  description?: string | null;
  createdBy: string
};

// Type fo upsertVote input
type UpsertVoteInput = {
  pollId: string;
  userId: string;
  rating: number // already validated in controller
};


/* POLLS - USER ENDPOINT SERVICES */

/* List polls with metrics */
// Return all polls along with aggregated metrics (avg rating, vote count).
// Add a boolean flag indicating whether the current user has voted each poll.
// Round avg to 1 decimal.
export async function listPollsWithMetrics(userId: string) {
  // Fetch all polls (id/title/status)
  const polls = await prisma.poll.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'asc' }, // keep current ordering (asc). Change to 'desc' if you prefer latest first.
  });

  // Group votes by pollId to calculate avg and count in one db query
  const stats = await prisma.vote.groupBy({
    by: ['pollId'],
    _avg: { rating: true },
    _count: { _all: true },
  });

  const statByPollId = new Map(
    stats.map(s => [s.pollId, { avg: s._avg.rating ?? 0, count: s._count._all }])
  );

  // --- NEW: fetch user votes for all listed polls in a single query ---
  // Reason: avoid N+1; check if current user has voted each poll
  const pollIds = polls.map(p => p.id);

  const userVotes = await prisma.vote.findMany({
    where: {
      userId,                  // current user
      pollId: { in: pollIds } // only for visible polls
    },
    select: { pollId: true }  // we only need the poll id
  });

  const votedSet = new Set(userVotes.map(v => v.pollId));

  // Merge polls with stats and userHasVoted (on missing stats: avg=0, count=0)
  const items = polls.map(p => {
    const s = statByPollId.get(p.id) ?? { avg: 0, count: 0 };
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      avg: Number(s.avg.toFixed(1)),
      count: s.count,
      // userHasVoted: true if the user has ever voted this poll (OPEN or CLOSED)
      userHasVoted: votedSet.has(p.id)
    };
  });

  return { items };
}


/* Get poll with metrics */
// Return the full poll view with metrics and evntual user vote (if already expressed).
// Normalize distribution to ensure ratings 1-5 are always present (missing → count=0).
// Round avg to 1 decimal.
export async function getPollByIdWithMetrics(pollId: string, userId: string) {
  // Make sure the poll exists (early 404)
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { id: true, title: true, description: true, status: true },
  });
  if (!poll) {
    throw new AppError(404, 'NOT_FOUND', 'Poll not found');
  }

  // Compute metrics in parallel (faster than sequential calls)
  const [agg, grouped, myVote] = await Promise.all([
    prisma.vote.aggregate({
      where: { pollId },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.vote.groupBy({
      by: ['rating'],
      where: { pollId },
      _count: { _all: true }
    }),
    // findFirst instead of findUnique (indipendent of composite key name and same performance)
    prisma.vote.findFirst({
      where: { pollId, userId },
      select: { rating: true }
    })
  ]);

  // Metrics
  const count = agg._count._all ?? 0;
  const avgRaw = agg._avg.rating ?? 0;
  const avg = Number(avgRaw.toFixed(1));

  // Distribution
  const distMap = new Map<number, number>();
  for (const row of grouped) distMap.set(row.rating, row._count._all);
  const distribution = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: distMap.get(r) ?? 0
  }));

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description ?? undefined, // omit null in JSON
    status: poll.status,
    avg,
    count,
    distribution,
    userVote: myVote?.rating ?? undefined // omit if user never voted
  };
}


/* Handle upsert vote (auth required) */
// Returns minimal shape in compliance with API contract.
// Rules to validate the request:
// - poll must exist, otherwise 404 NOT_FOUND.
// - poll must be OPEN, otherwise 403 FORBIDDEN.
// - unique on (userId, pollId) enforced by Prisma schema (composite unique).
export async function handleUpsertVote(input: UpsertVoteInput) {
  const { pollId, userId, rating } = input;

  // ensure poll exists and is OPEN
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { status: true }
  });

  if (!poll) {
    throw new AppError(404, 'NOT_FOUND', 'Poll not found');
  }
  if (poll.status !== 'OPEN') {
    throw new AppError(403, 'FORBIDDEN', 'Poll is closed');
  }

  // insert or update
  const vote = await prisma.vote.upsert({
    where: {
      userId_pollId: { userId, pollId },
    },
    create: {
      userId,
      pollId,
      rating
    },
    update: {
      rating,
    },
    select: {
      rating: true,
      pollId: true,
      userId: true
    }
  });

  return {
    pollId: vote.pollId,
    userId: vote.userId,
    rating: vote.rating
  };
}


/* POLLS - ADMIN ENDPOINT SERVICES */

/* Create poll (auth required) */
// Create a new poll as OPEN by default
export async function handleCreatePoll(input: CreatePollInput) {
  // Add poll in DB
  const poll = await prisma.poll.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      status: 'OPEN', // enforce OPEN by default
      createdBy: input.createdBy
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      createdAt: true
    }
  });

  // initialize distribution for the new poll
  const zeroDistribution = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: 0
  }));

  // shape the response compliant with API Contract
  return {
    id: poll.id,
    title: poll.title,
    // omit description if null to keep payload compliant with API Contract
    ...(poll.description ? { description: poll.description } : {}),
    status: poll.status, // "OPEN"
    stats: {
      count: 0,
      avg: 0,
      distribution: zeroDistribution
    }
  };
}


/* Close poll (auth required) */
// Update status -> CLOSED and returns minimal payload.
// Rules to validate the request:
// - poll must exist, otherwise 404 NOT_FOUND.
// - poll must be OPEN, otherwise 403 CONFLICT.
export async function handleClosePoll(pollId: string) {
  // Read current poll
  const poll = await prisma.poll.findUnique({
    where: { id: pollId }
  });

  if (!poll) {
    throw new AppError(404, 'NOT_FOUND', 'Poll not found');
  }

  if (poll.status === 'CLOSED') {
    throw new AppError(409,'CONFLICT', 'Poll already closed');
  }

  // Mark as CLOSED (irreversible for MVP/test)
  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { status: 'CLOSED' }
  });

  // Return minimal response in compliance  with API contract
  return {
    id: updated.id,
    status: updated.status as 'CLOSED'
  };
}