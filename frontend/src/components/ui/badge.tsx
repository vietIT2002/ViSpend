import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

/** The five status tones of DESIGN.md. A badge always carries its text. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-black/[0.05] text-charcoal",
  info: "bg-pastel-blue text-pastel-blue-ink",
  success: "bg-pastel-green text-pastel-green-ink",
  warning: "bg-pastel-yellow text-pastel-yellow-ink",
  danger: "bg-pastel-red text-pastel-red-ink",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-4 whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
