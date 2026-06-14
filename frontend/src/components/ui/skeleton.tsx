import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-black/[0.055]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.3s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
