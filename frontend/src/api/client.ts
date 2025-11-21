// Type for API error
export type ApiError = {
  status: number;
  message: string
};

// Base URL (fallback a "/api" se la env manca)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api") as string;


// get JWT token from localStorage
function getToken(): string | null {
  return localStorage.getItem("token");
}


/* HTTP client for app API with JWT support */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // compose URL
  const url = `${API_BASE}${path}`;

  // default headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // inject Authorization header if token exists
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // execute request
  const res = await fetch(url, { ...options, headers });

  // try to parse JSON, otherwise fallback to text
  let payload: unknown = null;
  let raw = "";
  try {
    raw = await res.text();
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw || null;
  }

  if (!res.ok) {
    // extract message from our standard shape: { error: { code, message } }
    const payloadObj =
      typeof payload === "object" && payload ? (payload as Record<string, unknown>) : null;

    const messageFromApi =
      (payloadObj?.error &&
        typeof (payloadObj.error as { message?: unknown }).message === "string" &&
        (payloadObj.error as { message?: string }).message) ||
      (payloadObj?.message && typeof payloadObj.message === "string" ? payloadObj.message : undefined) ||
      (typeof payload === "string" ? payload : undefined);

    const err: ApiError = {
      status: res.status,
      message: messageFromApi || "Request failed"
    };

    throw err;
  }

  return payload as T;
}
