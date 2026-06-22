// Defaults to "/api" so the Vite dev proxy (and a same-origin production
// deploy) work with zero config. Override with VITE_API_URL when the API is
// hosted on a different origin.
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "https://vispend-api.onrender.com/api" : "/api");

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

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

function refreshTokenValue() {
  return localStorage.getItem("vispend_refresh");
}

// Persist/clear the access + refresh token pair (used by the auth provider).
export function setTokens(access: string, refresh?: string) {
  localStorage.setItem("vispend_token", access);
  if (refresh) localStorage.setItem("vispend_refresh", refresh);
}
export function clearTokens() {
  localStorage.removeItem("vispend_token");
  localStorage.removeItem("vispend_refresh");
}

// The auth provider registers a handler so any 401 that survives a refresh
// attempt can clear the session and send the user back to login.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// 401s on these endpoints are normal failures (e.g. wrong password) and must
// NOT trigger a refresh/logout.
const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
];

type ApiRequestInit = RequestInit & { timeoutMs?: number };

function timeoutError() {
  return new ApiError("Request timed out. Please try again.", 408);
}

// Single-flight token refresh: many requests can 401 at once (access token just
// expired); they all await the same refresh call instead of stampeding it.
let refreshPromise: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const rt = refreshTokenValue();
      if (!rt) return false;
      try {
        const r = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!r.ok) return false;
        const data = await r.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        return false;
      }
    })();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// One fetch attempt with the current access token + a timeout.
async function fetchOnce(
  path: string,
  requestInit: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal | null,
): Promise<Response> {
  const headers = new Headers(requestInit.headers);
  const authToken = token();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (!(requestInit.body instanceof FormData) && requestInit.body != null) {
    headers.set("Content-Type", "application/json");
  }
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    return await fetch(`${API_URL}${path}`, {
      ...requestInit,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw timeoutError();
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

// Fetch with a silent one-time refresh-and-retry when the access token expired.
async function requestRaw(path: string, init: ApiRequestInit): Promise<Response> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal, ...requestInit } = init;
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));
  let response = await fetchOnce(path, requestInit, timeoutMs, signal);
  if (response.status === 401 && token() && !isAuthPath) {
    const refreshed = await tryRefresh();
    if (refreshed) response = await fetchOnce(path, requestInit, timeoutMs, signal);
    if (response.status === 401) onUnauthorized?.(); // refresh failed/expired
  }
  return response;
}

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await requestRaw(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(body.detail ?? response.statusText, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// Fetch a binary response (e.g. a decrypted receipt image) with auth + refresh.
async function requestBlob(path: string): Promise<Blob> {
  const response = await requestRaw(path, {});
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(body.detail ?? response.statusText, response.status);
  }
  return response.blob();
}

export const api = {
  get: <T>(path: string, init?: ApiRequestInit) => request<T>(path, init),
  getBlob: (path: string) => requestBlob(path),
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
