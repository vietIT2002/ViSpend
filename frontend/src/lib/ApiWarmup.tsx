import { useEffect } from "react";

import { api } from "./api";

const WARMUP_TIMEOUT_MS = 8_000;
const KEEPALIVE_INTERVAL_MS = 4 * 60_000;

function warmApi() {
  void api.get("/health", { timeoutMs: WARMUP_TIMEOUT_MS }).catch(() => {
    // Best effort only; user-facing requests still report real errors.
  });
}

export function ApiWarmup() {
  useEffect(() => {
    warmApi();

    const onFocus = () => warmApi();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") warmApi();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") warmApi();
    }, KEEPALIVE_INTERVAL_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
