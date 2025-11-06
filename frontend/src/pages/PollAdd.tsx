/* React */
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

/* App components */
import TopBar from "../components/TopBar";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/*
Types aligned with API contract:
- POST /polls accepts { title: string; description?: string }
- returns created poll (status OPEN by default)
*/

/* Create new poll page (admin only) */
export default function PollAddPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Guard: only admins can access this page
  if (user?.role !== "admin") {
    // simple safety: non-admin users are bounced to the list
    return <Navigate to="/polls" replace />;
  }

  // Local form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  /* Mutation: create a new poll */
  // - Send POST /polls with JSON body payload.
  // - On success: toast + invalidate list + go back to /polls.
  const createMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/polls", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          // send description only if not empty (optional field in API )
          ...(description.trim() ? { description: description.trim() } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Sondaggio creato!");
      // keep the list in sync
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      navigate("/polls");
    },
    onError: (err: any) => {
      // Friendly error mapping based on API error shape
      const code = err?.error?.code;
      const msg =
        code === "FORBIDDEN"
          ? "Solo gli amministratori possono creare sondaggi."
          : code === "VALIDATION_ERROR"
            ? "Titolo obbligatorio."
            : "Problema di rete o server. Riprova.";
      toast.error(msg);
    },
  });

  // client-side validation (title required)
  const canSubmit = title.trim().length > 0 && !createMutation.isPending;

  // Render
  return (
    <> {/* React fragment (no extra wrapper in DOM) */}

      {/* Global top navigation */}
      <header>
        <TopBar />
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {/* Title */}
          <div className="mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Crea sondaggio</h1>
          </div>

          {/* Status badge (new polls are OPEN by contract) */}
          <div className="mb-8">
            <span
              className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800"
              aria-label="Stato: Aperto"
              title="I nuovi sondaggi sono aperti"
            >
              Aperto
            </span>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              createMutation.mutate();
            }}
            className="space-y-8"
          >
            {/* Title (required) */}
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium">
                Titolo <span className="text-red-600">*</span>
              </label>
              <input
                id="title"
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Lettura, Musica, Cinema…"
                disabled={createMutation.isPending}
                required
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Obbligatorio: argomento breve e chiaro.</span>
                <span>{title.length}/80</span>
              </div>
            </div>

            {/* Description (optional) */}
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium">
                Descrizione (opzionale)
              </label>
              <textarea
                id="description"
                className="min-h-24 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Domanda o dettaglio oggetto del sondaggio..."
                disabled={createMutation.isPending}
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Facoltativo: appare sotto il titolo nella pagina dei dettagli.</span>
                <span>{description.length}/500</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                to="/polls"
                className="text-sm text-neutral-700 underline underline-offset-4 hover:text-black"
              >
                Annulla
              </Link>

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? "Creazione..." : "Crea sondaggio"}
              </button>
            </div>
          </form>
        </section>

        {/* Bottom back link (extra affordance) */}
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