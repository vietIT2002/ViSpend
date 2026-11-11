import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

/** One bordered surface per region; no shadow (shadows belong to dialogs and toasts). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-line bg-surface", className)} {...props} />;
}

/** A card's title row: heading on the left, an optional action on the right. */
export function CardHeader({
  title,
  titleId,
  action,
  description,
  className,
}: {
  title: string;
  titleId?: string;
  action?: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="text-base font-semibold leading-6 text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
