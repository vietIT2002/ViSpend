// Defaults to "/api" so the Vite dev proxy (and a same-origin production
// deploy) work with zero config. Override with VITE_API_URL when the API is
// hosted on a different origin.
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "https://vispend-api.onrender.com/api" : "/api");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function token() {
  return localStorage.getItem("vispend_token");
}

// The auth provider registers a handler so any 401 on an authenticated request
// can clear the expired session and send the user back to login.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// 401s on these endpoints are normal failures (e.g. wrong password) and must
// NOT trigger a session logout.
const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/forgot-password",
  "/auth/reset-password",
];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const authToken = token();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (!(init.body instanceof FormData) && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    if (
      response.status === 401 &&
      authToken &&
      !AUTH_PATHS.some((p) => path.startsWith(p))
    ) {
      // The session token was rejected (expired/invalid): log out globally.
      onUnauthorized?.();
    }
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(body.detail ?? response.statusText, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function buildQuery(path: string, params: object) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
