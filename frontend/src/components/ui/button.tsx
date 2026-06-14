import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-surface text-ink border border-line hover:bg-canvas",
  ghost: "text-charcoal hover:bg-black/[0.04]",
  danger: "text-expense hover:bg-pastel-red",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
        "transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-ink/15 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
