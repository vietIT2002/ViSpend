import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded bg-black/[0.06] animate-pulse motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

/** Table rows at their final 40px height, so the page does not jump when data arrives. */
export function TableSkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="h-10" aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-3">
              <Skeleton className="h-4 w-full max-w-40" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
