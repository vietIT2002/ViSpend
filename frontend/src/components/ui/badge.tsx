import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type Tone = "red" | "green" | "blue" | "yellow" | "neutral";

const tones: Record<Tone, string> = {
  red: "bg-pastel-red text-pastel-red-ink",
  green: "bg-pastel-green text-pastel-green-ink",
  blue: "bg-pastel-blue text-pastel-blue-ink",
  yellow: "bg-pastel-yellow text-pastel-yellow-ink",
  neutral: "bg-black/[0.05] text-charcoal",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
