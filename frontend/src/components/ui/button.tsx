import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-canvas",
  ghost: "text-charcoal hover:bg-black/[0.05]",
  // Icon-only delete buttons in rows.
  danger: "text-expense hover:bg-pastel-red",
  // The confirming button of a destructive dialog.
  destructive: "bg-expense text-white hover:bg-expense-dark",
};

export function Button({
  className,
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded px-3.5 text-sm font-medium whitespace-nowrap sm:h-9",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}
