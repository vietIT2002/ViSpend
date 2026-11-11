import type { ReactNode } from "react";

/**
 * Title on the left (24px, plural object or module name), actions on the right
 * with the one primary action last. An optional meta line sits under the title.
 */
export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-8 text-ink">{title}</h1>
        {meta && <div className="mt-1 text-sm text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}
