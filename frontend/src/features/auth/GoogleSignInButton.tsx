import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "486347902494-mruf16d1kl8n3u8hqv5qtohtd850ib6j.apps.googleusercontent.com";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonConfig = {
  type: "standard";
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  width: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
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

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderGoogleButton() {
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

      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

      buttonRef.current.innerHTML = "";
      const width = Math.max(260, Math.min(390, buttonRef.current.clientWidth || 390));
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          } else {
            onError("Google did not return a sign-in credential.");
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
      setReady(true);
    }

    void renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <div ref={buttonRef} className="min-h-12 w-full" />
      {!ready && (
        <div className="grid h-12 w-full place-items-center rounded-lg border border-line bg-white text-sm text-muted">
          Loading Google...
        </div>
      )}
    </div>
  );
}
