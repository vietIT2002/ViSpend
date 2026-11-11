import type { KeyboardEvent } from "react";

import { useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";

const PALETTE = [
  "#3cb371",
  "#2e8b57",
  "#0f766e",
  "#1f6c9f",
  "#3b82f6",
  "#7a5c9e",
  "#a855f7",
  "#ec4899",
  "#9f2f2d",
  "#dc2626",
  "#b5651d",
  "#956400",
  "#eab308",
  "#5b6770",
];

/** Colour choice as a radio group; the selected swatch shows a ring and a check. */
export function ColorSwatchPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: string | null;
  onChange: (color: string) => void;
  labelledBy: string;
}) {
  const t = useT();
  const isCustom = value != null && !PALETTE.includes(value);
  // One tab stop: the checked swatch, or the first when the value is custom/none.
  const tabStop = value != null && PALETTE.includes(value) ? value : PALETTE[0];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = PALETTE[(index + delta + PALETTE.length) % PALETTE.length];
    onChange(next);
    const group = e.currentTarget.parentElement;
    requestAnimationFrame(() => group?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus());
  }
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-1.5">
      {PALETTE.map((c, i) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          data-value={c}
          tabIndex={c === tabStop ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          aria-label={t("cat.colorOption", { color: c })}
          title={c}
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={cn(
            "grid size-8 place-items-center rounded text-white",
            value === c ? "ring-2 ring-ink ring-offset-2" : "ring-1 ring-black/10",
          )}
        >
          {value === c && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      ))}
      {/* Custom colour: a native picker behind a rainbow swatch. */}
      <label
        title={t("cat.customColor")}
        style={{
          background: "conic-gradient(from 90deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
        }}
        className={cn(
          "relative grid size-8 cursor-pointer place-items-center rounded focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
          isCustom ? "ring-2 ring-ink ring-offset-2" : "ring-1 ring-black/10",
        )}
      >
        <span className="sr-only">{t("cat.customColor")}</span>
        <input
          type="color"
          value={value ?? DEFAULT_CATEGORY_COLOR}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

export const DEFAULT_CATEGORY_COLOR = PALETTE[0];
