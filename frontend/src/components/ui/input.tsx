import type { ComponentProps } from "react";

import { cn } from "../../lib/utils";

/** Shared control look: 36px (40px on touch), 3:1 border, red border when invalid. */
export const controlClass = cn(
  "h-10 w-full rounded border border-input bg-surface px-3 text-sm text-ink sm:h-9",
  "outline-none transition-colors duration-150 placeholder:text-muted",
  "focus:border-brand focus:ring-2 focus:ring-brand/25",
  "aria-[invalid=true]:border-expense aria-[invalid=true]:focus:ring-expense/20",
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}
