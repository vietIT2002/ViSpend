import { ApiError } from "./api";
import { en, type TKey } from "./i18n/en";

const UNAVAILABLE_STATUSES = new Set([408, 502, 503, 504]);

/** Maps a sign-in failure to the i18n key to show. */
export function authErrorKey(err: unknown, fallback: TKey): TKey {
  if (err instanceof TypeError) return "auth.serverUnavailable";
  if (err instanceof ApiError) {
    if (UNAVAILABLE_STATUSES.has(err.status)) return "auth.serverUnavailable";
    const key = `errors.${err.message}`;
    if (key in en) return key as TKey;
  }
  return fallback;
}
