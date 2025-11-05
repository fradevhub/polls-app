import { useAuth } from "../auth/AuthContext";

/* Polls page component */
export default function PollsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">Polls</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{user?.username}</span>
          <button
            onClick={logout}
            className="rounded-lg border px-3 py-1.5 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-lg">Hello World — autenticazione riuscita.</p>
          <p className="mt-2 text-sm text-gray-600">
            Da qui chiameremo <code>/polls</code> e mostreremo la lista/card.
          </p>
        </div>
      </main>
    </div>
  );
}