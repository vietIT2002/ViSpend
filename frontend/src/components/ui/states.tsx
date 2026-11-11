import { AlertCircle, AlertTriangle, CheckCircle2, Info, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { Button } from "./button";

/**
 * First use and no results are different states: give first use a sentence on
 * what belongs here plus the primary action, and no results a Clear filters.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-6 py-10 text-center", className)}>
      <p className="text-base font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** What failed, plus Retry. Stays until the user retries. */
export function ErrorState({
  message,
  onRetry,
  retrying,
  className,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <p className="flex items-start gap-2 text-sm font-medium text-expense">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCcw size={16} aria-hidden="true" />}
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

type AlertTone = "error" | "warning" | "info" | "success";

const alertTone: Record<AlertTone, { box: string; icon: typeof Info }> = {
  error: { box: "border-pastel-red-ink/25 bg-pastel-red text-pastel-red-ink", icon: AlertCircle },
  warning: { box: "border-pastel-yellow-ink/25 bg-pastel-yellow text-pastel-yellow-ink", icon: AlertTriangle },
  info: { box: "border-pastel-blue-ink/25 bg-pastel-blue text-pastel-blue-ink", icon: Info },
  success: { box: "border-pastel-green-ink/25 bg-pastel-green text-pastel-green-ink", icon: CheckCircle2 },
};

/**
 * An inline message or page banner: icon + one sentence + optional action.
 * Errors use role="alert"; the rest role="status".
 */
export function InlineAlert({
  tone,
  children,
  action,
  onDismiss,
  className,
}: {
  tone: AlertTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = useT();
  const { box, icon: Icon } = alertTone[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm", box, className)}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.dismiss")}
          className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded hover:bg-black/[0.06]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
