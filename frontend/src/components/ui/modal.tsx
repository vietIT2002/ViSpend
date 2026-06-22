import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../lib/utils";
import { IconX } from "../icons";

export function Modal({
  open,
  onClose,
  title,
  children,
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // "start" anchors the panel near the top so it grows downward (no recentering
  // jump when its content height changes — e.g. expanding a section).
  align?: "center" | "start";
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 grid justify-items-center p-4",
        align === "start" ? "items-start pt-[7vh]" : "items-center",
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.10)] outline-none rise"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-lg text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            <IconX size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
