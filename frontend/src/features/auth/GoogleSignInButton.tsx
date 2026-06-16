import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "486347902494-mruf16d1kl8n3u8hqv5qtohtd850ib6j.apps.googleusercontent.com";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken: () => void };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: {
  onCredential: (accessToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const clientRef = useRef<TokenClient | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!GOOGLE_CLIENT_ID) {
        onError("Google sign-in is not configured.");
        return;
      }
      try {
        await loadGoogleScript();
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : "Could not load Google sign-in.");
        }
        return;
      }
      if (cancelled || !window.google?.accounts?.oauth2) return;

      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: (response) => {
          if (response.access_token) {
            onCredential(response.access_token);
          } else {
            onError("Google sign-in was cancelled.");
          }
        },
      });
      setReady(true);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  return (
    <button
      type="button"
      disabled={disabled || !ready}
      onClick={() => clientRef.current?.requestAccessToken()}
      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-white text-base font-medium text-charcoal transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleLogo />
      {ready ? "Continue with Google" : "Loading Google..."}
    </button>
  );
}
