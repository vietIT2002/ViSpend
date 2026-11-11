import { useId, type KeyboardEvent } from "react";

import { cn } from "../../lib/utils";

/**
 * A single-choice field shown as segments (radio group): arrow keys move the
 * choice, the selected segment uses a subtle fill and bold text, not colour alone.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  labelVisible = true,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  labelVisible?: boolean;
  className?: string;
}) {
  const labelId = useId();

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    const group = e.currentTarget.parentElement;
    requestAnimationFrame(() =>
      group?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus(),
    );
  }

  return (
    <div className={className}>
      <span id={labelId} className={labelVisible ? "mb-1.5 block text-sm font-medium text-ink" : "sr-only"}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex max-w-full rounded border border-line-strong bg-surface p-0.5"
      >
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-value={o.value}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "h-9 whitespace-nowrap rounded-sm px-3 text-sm transition-colors sm:h-8",
                selected ? "bg-brand-soft font-semibold text-brand" : "text-charcoal hover:bg-black/[0.04]",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
