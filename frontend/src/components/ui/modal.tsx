import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { IconX } from "../icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog: labelled by its title, traps Tab, closes on Esc and backdrop click,
 * and gives focus back to the control that opened it.
 * Focus starts on `initialFocusRef`, else on the first element marked
 * `data-autofocus`, else on the first field or button of the body.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  size = "md",
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: "sm" | "md";
  // "start" anchors the panel near the top so it grows downward (no recentering
  // jump when its content height changes — e.g. expanding a section).
  align?: "center" | "start";
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Keep the latest onClose without re-running the open effect (which would steal focus).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const target =
      initialFocusRef?.current ??
      body.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      body.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel.current;
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
    // initialFocusRef is read once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 grid justify-items-center p-4",
        align === "start" ? "items-start pt-[7vh]" : "items-center",
      )}
    >
      <div className="absolute inset-0 bg-ink/40" onClick={() => onCloseRef.current()} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "rise relative flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-lg border border-line bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.14)] outline-none",
          size === "sm" ? "max-w-md" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-7 text-ink">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label={t("common.close")}
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <IconX size={16} aria-hidden="true" />
          </button>
        </div>
        <div ref={body} className="min-h-0 overflow-y-auto px-5 pb-5 pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
