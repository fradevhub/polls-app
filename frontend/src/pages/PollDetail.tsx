/* React */
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

/* App components */
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import TopBar from "../components/TopBar";

/* Type for poll list response (aligned with API contract) */
type PollStatus = "OPEN" | "CLOSED";

type DistributionBucket = {
  rating: 1 | 2 | 3 | 4 | 5;
  count: number;
};

type PollDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: PollStatus;
  avg: number;                        // 0-5 (0 if no votes)
  count: number;                      // total votes
  distribution: DistributionBucket[]; // always 1-5 ascending
  userVote?: 1 | 2 | 3 | 4 | 5;
};


/* Helper to localize rating  */
const formatAvg = (avg: number, count: number) =>
  count === 0
    ? "—"
    : new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
      avg
    );


// Tiny inline SVGs (no extra icon packages)
const StarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
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


/* Simple skeleton lines */
function LineSkeleton({ w = "100%" }: { w?: string }) {
  return <div className="h-4 rounded bg-neutral-200/70" style={{ width: w }} />;
}


/* Data fetching */
async function fetchPollDetail(id: string): Promise<PollDetail> {
  return apiFetch(`/polls/${id}`) as Promise<PollDetail>;
}


/* PollDetail page component  */
export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => fetchPollDetail(id!),
    enabled: !!id,
  });

  // local selection reflects the vote saved on the server (if it exists)
  const [selection, setSelection] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  // modal open/close state
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (data?.userVote) setSelection(data.userVote);
    else setSelection(null);
  }, [data?.userVote]);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOpen = data?.status === "OPEN";
  const total = data?.count ?? 0;

  /* Vote mutation (upsert), allowed only if pool is OPEN */
  const voteMutation = useMutation({
    mutationFn: async (rating: number) =>
      apiFetch(`/polls/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      toast.success("Voto registrato!");
      // refresh both detail and list so metrics stay in sync
      queryClient.invalidateQueries({ queryKey: ["poll", id] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: () => {
      toast.error("Impossibile registrare il voto.");
    },
  });

  /* Vote submit handler */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOpen || !selection) return;
    voteMutation.mutate(selection);
  };

  /* Close poll mutation, allowed only for admin when the pool is OPEN */
  const closePoll = useMutation({
    mutationFn: async () =>
      apiFetch(`/polls/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Sondaggio chiuso!");
      queryClient.invalidateQueries({ queryKey: ["poll", id] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: () => {
      toast.error("Impossibile chiudere il sondaggio.");
    },
  });

  // Render
  return (
    <> {/* React fragment (groups elements without adding extra HTML) */}

      {/* Global top navigation */}
      <header>
        <TopBar />
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Loading state */}
        {isLoading && (
          <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <LineSkeleton w="70%" />
            </div>
            <div className="mb-2">
              <div className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-transparent">
                …
              </div>
            </div>
            <div className="mb-6">
              <LineSkeleton w="90%" />
            </div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-neutral-200" />
              <LineSkeleton w="80px" />
              <LineSkeleton w="30px" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <LineSkeleton key={i} />
              ))}
            </div>
          </section>
        )}

        {/* Error state */}
        {isError && (
          <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Errore nel caricamento.
            <button onClick={() => refetch()} className="ml-2 underline underline-offset-2">
              Riprova
            </button>
          </section>
        )}

        {/* Success state */}
        {data && (
          <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            {/* Title + status */}
            <div className="mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
            </div>

            <div className="mb-4">
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

            {/* Optional description */}
            {data.description && (
              <p className="mb-6 text-sm text-neutral-700 leading-relaxed">{data.description}</p>
            )}

            {/* Summary row: avg + votes */}
            <div className="mb-6 flex items-center gap-2 text-neutral-900">
              {/* Average value */}
              <StarIcon className="w-5 h-5 text-yellow-500" />
              <span className="text-base font-medium">{formatAvg(data.avg, total)}</span>
              <span className="text-sm text-neutral-600">media</span>

              {/* Separator */}
              <span className="text-neutral-400" aria-hidden="true">|</span>

              {/* Votes count */}
              <UsersIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-700">{total}</span>
              <span className="text-sm text-neutral-600">voti</span>
            </div>

            {/* Distribution bars (1★ - 5★) */}
            <div className="mb-6 space-y-2">
              {data.distribution.map((b) => {
                const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                return (
                  <div key={b.rating} className="flex items-center gap-3">
                    {/* Left: 1-5 star icon */}
                    <div className="w-8 shrink-0 text-xs tabular-nums text-neutral-600">
                      {b.rating}★
                    </div>

                    {/* Bar: background track + filled segment */}
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${b.rating >= 4 ? "bg-yellow-400/90" : "bg-blue-400/90"}`}
                        style={{ width: `${pct}%` }}
                        aria-label={`${b.rating} stelle: ${b.count} voti (${pct}%)`}
                        title={`${pct}%`}
                      />
                    </div>

                    {/* Right: count */}
                    <div className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-600">
                      {b.count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vote block (if pool is OPEN) */}
            {isOpen ? (
              <form onSubmit={handleSubmit} className="mt-6">
                <fieldset className="mb-3">
                  <legend className="mb-2 text-sm font-medium text-neutral-900">
                    Esprimi il tuo voto
                  </legend>

                  {/* 5 selectable stars (radio-style, accessible) */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => {
                      const active = selection === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelection(r as 1 | 2 | 3 | 4 | 5)}
                          className={[
                            "inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm",
                            active
                              ? "border-black bg-black text-white"
                              : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
                          ].join(" ")}
                        >
                          {r}★
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={!selection || voteMutation.isPending}
                  className="mt-2 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                  {data.userVote ? "Aggiorna voto" : "Vota"}
                </button>

                {/* Little hint under the button */}
                {data.userVote && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Hai già votato: <strong>{data.userVote}★</strong> (puoi modificare il voto).
                  </p>
                )}
              </form>
            ) : (
              <p className="mt-6 text-sm text-neutral-600">Sondaggio chiuso.</p>
            )}

            {/* Close button (if pool is OPEN and user is admin) */}
            {isAdmin && isOpen && (
              <> {/* React fragment */}
                <div className="mt-6">
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={closePoll.isPending}
                    className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 active:bg-red-200 disabled:opacity-50"
                  >
                    {closePoll.isPending ? "Chiusura in corso..." : "Chiudi sondaggio"}
                  </button>
                </div>

                <ConfirmModal
                  open={confirmOpen}
                  onCancel={() => setConfirmOpen(false)}
                  onConfirm={() => {
                    setConfirmOpen(false);
                    closePoll.mutate();
                  }}
                />
              </>
            )}
          </section>
        )}

        {/* Bottom back link only (TopBar already has nav) */}
        <div className="mx-auto my-8 max-w-5xl px-1">
          <Link
            to="/polls"
            className="text-sm text-neutral-700 underline underline-offset-4 hover:text-black"
          >
            ← Torna alla lista
          </Link>
        </div>
      </main>
    </>
  );
}


/* Local component: simple modal confirm */
// Defined outside PollDetailPage to avoid re-creation on each render.
function ConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {

  if (!open) return null;

  // Render
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-80">
        <h2 className="text-lg font-semibold mb-3">Conferma chiusura</h2>
        <p className="text-sm text-neutral-700 mb-5">
          Chiudere definitivamente questo sondaggio? <br /><br />
          L’operazione non potrà essere annullata.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700"
          >
            Chiudi sondaggio
          </button>
        </div>
      </div>
    </div>
  );
}
