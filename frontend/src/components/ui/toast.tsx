import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useT } from "../../lib/i18n";

/**
 * Success toasts only, one at a time, naming the record ("Expense 120.000 ₫ saved").
 * Errors stay inline where they happened. The live region is always mounted so
 * screen readers announce each new message.
 */
const ToastContext = createContext<(message: string) => void>(() => undefined);

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const counter = useRef(0);

  const show = useCallback((message: string) => {
    counter.current += 1;
    setToast({ id: counter.current, message });
  }, []);

  // The removed node never fires mouseleave/blur, so reset on every toast change.
  const toastId = toast?.id ?? null;
  useEffect(() => {
    setPaused(false);
  }, [toastId]);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(() => setToast(null), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, paused]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end"
      >
        {toast && (
          <div
            key={toast.id}
            className="rise pointer-events-auto flex w-full items-start gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => {
                setPaused(false);
                setToast(null);
              }}
              aria-label={t("common.dismiss")}
              className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded text-muted hover:bg-black/[0.05] hover:text-ink"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
