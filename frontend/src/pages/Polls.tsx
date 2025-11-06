/* React */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/* App components */
import { apiFetch } from "../api/client";
import TopBar from "../components/TopBar";

/* Type for poll list response (aligned with API contract) */
type PollStatus = "OPEN" | "CLOSED";

type PollListItem = {
  id: string;
  title: string;
  status: PollStatus;  // "OPEN" | "CLOSED"
  avg: number;         // 0..5 (0 if no votes)
  count: number;       // total votes
  userHasVoted: boolean;
};

type PollListResponse = {
  items: PollListItem[];
};


/* Helper to localize rating (e.g. 3.2 or dash if no votes) */
const formatRating = (avg: number, count: number) =>
  count === 0
    ? "—"
    : new Intl.NumberFormat("it-IT", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(avg);


// Tiny inline SVGs (no extra icon packages)
const StarIcon = ({ className = "w-5 h-5 text-yellow-500" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </svg>
);

const UsersIcon = ({ className = "w-4 h-4 text-neutral-500" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16 11a3 3 0 0 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 0 0 0-6 3 3 0 0 0 0 6Zm0 2C5.67 13 1 14.17 1 16.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm10 0c-.35 0-.68.02-.99.06 1.16.84 1.99 1.94 1.99 3.44V20h4v-3.5c0-2.33-4.67-3.5-7-3.5Z"
    />
  </svg>
);


/* Data fetching */
async function fetchPolls(): Promise<PollListItem[]> {
  const res = (await apiFetch("/polls")) as PollListResponse;
  return res.items;
}


/* Skeleton Card using react-loading-skeleton */
function PollCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Title */}
      <div className="mb-1">
        <Skeleton width={"60%"} height={24} borderRadius={8} />
      </div>

      {/* Status òabeò below title */}
      <div className="mb-4">
        <Skeleton width={60} height={20} borderRadius={999} />
      </div>

      {/* Rating row */}
      <div className="mb-8 flex items-center gap-3">
        <Skeleton width={20} height={20} circle />
        <Skeleton width={40} height={18} />
        <Skeleton width={14} height={18} />
        <div className="ml-2 flex items-center gap-1">
          <Skeleton width={16} height={16} circle />
          <Skeleton width={28} height={14} />
        </div>
      </div>

      {/* Call to action */}
      <div className="mt-8 flex justify-end">
        <Skeleton width={120} height={40} borderRadius={10} />
      </div>
    </div>
  );
}


/* Single Poll Card */
function PollCard({ poll }: { poll: PollListItem }) {
  const navigate = useNavigate();
  const isOpen = poll.status === "OPEN";

  // Decide CTA label based on rules
  const ctaLabel = isOpen
    ? poll.userHasVoted
      ? "Modifica voto"
      : "Vota"
    : "Vedi risultati";

  // Route behavior
  const handleClick = () => {
    navigate(`/polls/${poll.id}`);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Header: title with status below */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold leading-tight text-neutral-900 mb-1">
          {poll.title}
        </h3>

        <span
          className={[
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            isOpen ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-700",
          ].join(" ")}
          aria-label={`Stato: ${isOpen ? "Aperto" : "Chiuso"}`}
        >
          {isOpen ? "Aperto" : "Chiuso"}
        </span>
      </div>

      {/* Metrics row */}
      <div className="mb-8 flex items-center gap-3 text-neutral-800">
        <StarIcon />
        <span className="text-base font-medium">{formatRating(poll.avg, poll.count)}</span>
        
        {/* Spacer for alignment */}
        <span className="inline-block w-1" aria-hidden="true"></span>

        <span className="ml-2 inline-flex items-center gap-1 text-sm text-neutral-600">
          <UsersIcon />
          {poll.count}
        </span>
      </div>

      {/* CTA bottom-right */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleClick}
          className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}


/* Polls page component  */
export default function PollsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["polls"],
    queryFn: fetchPolls,
    // cache data for 30s (speed up navigation when returning to this page)
    staleTime: 30_000
  });

  // Reender
  return (
    <> {/* React fragment (groups elements without adding extra HTML) */}

      {/* Header with TopBar */}
      <header>
        <TopBar />
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Page title */}
        <div className="mb-6 mt-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Sondaggi disponibili</h1>
        </div>

        {/* Loading state with skeleton grid */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Errore nel caricamento.
            <button onClick={() => refetch()} className="ml-2 underline underline-offset-2">
              Riprova
            </button>
          </div>
        )}

        {/* Success state */}
        {data && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}