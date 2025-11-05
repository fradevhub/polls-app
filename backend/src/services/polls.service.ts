import { prisma } from '../db';

/* List polls with metrics */
 // Return all polls along with aggregated metrics (avg rating, vote count).
 // Execute single DB query for stats using groupBy on votes.
 // Round avg to 1 decimal.
export async function listPollsWithMetrics() {
  // Fetch all polls (id/title/status)
  const polls = await prisma.poll.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group votes by pollId to calculate avg and count in one round trip
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