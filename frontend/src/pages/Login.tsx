import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

import type { FormEvent } from "react";
import type { ApiError } from "../api/client";

// Type for login response
type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: "user" | "admin";
    username: string
  }
};


/* Login page component */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // If already logged in, bounce to /polls
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/polls", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle user login request with React Query mutation.
  // Send email/password to backend, saves auth state on success and redirects to polls page.
  const mutation = useMutation<LoginResponse, ApiError, { email: string; password: string }>({
    mutationFn: (body) =>
      apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body)
      }),
    onSuccess: (data) => {
      // save auth state and go to polls
      login(data);
      navigate("/polls")
    },
  });

  // Handle form submit
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    mutation.mutate({ email, password });
  };

  // Loading state
  const isLoading = mutation.isPending;

  // Handle error incoming messages { status, message } 
  const errorMsg =
    mutation.error?.status === 401
      ? "Email o password non valide."
      : mutation.error
      ? "Problema di rete o server. Riprova."
      : "";

  // Render
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="flex flex-col items-center w-full">
        {/* Logo centrato sopra al box del form */}
        <img src="/polls_app_logo.png" alt="PollsApp logo" className="mb-10 h-16 w-auto" />

        {/* Box bianco con il form di login */}
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="mb-6 text-2xl font-semibold">Accedi</h1>

          {errorMsg && (
            <p
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              aria-live="polite"
            >
              {errorMsg}
            </p>
          )}

          {/* Form di login */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="mt-2 w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {isLoading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}