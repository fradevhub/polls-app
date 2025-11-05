import { prisma } from '../db';
import { AppError } from '../middlewares/error.middleware';

/* List polls with metrics */
// Return all polls along with aggregated metrics (avg rating, vote count).
// Round avg to 1 decimal.
export async function listPollsWithMetrics() {
  // Fetch all polls (id/title/status)
  const polls = await prisma.poll.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'asc' },
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

  // Merge polls with stats (on missing stats: avg=0, count=0)
  const items = polls.map(p => {
    const s = statByPollId.get(p.id) ?? { avg: 0, count: 0 };
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      avg: Number(s.avg.toFixed(1)),
      count: s.count,
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
      _count: { _all: true },
    }),
    prisma.vote.groupBy({
      by: ['rating'],
      where: { pollId },
      _count: { _all: true },
    }),
    // findFirst instead of findUnique (indipendent of composite key name and same performance)
    prisma.vote.findFirst({
      where: { pollId, userId },
      select: { rating: true },
    }),
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
    count: distMap.get(r) ?? 0,
  }));

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description ?? undefined, // omit null in JSON
    status: poll.status,
    avg,
    count,
    distribution,
    userVote: myVote?.rating ?? undefined, // omit if user never voted
  };
}