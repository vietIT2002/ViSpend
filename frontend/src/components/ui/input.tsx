import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink",
        "outline-none transition-colors duration-150 placeholder:text-muted",
        "focus:border-brand focus:ring-2 focus:ring-brand/15",
        className,
      )}
      {...props}
    />
  );
}
