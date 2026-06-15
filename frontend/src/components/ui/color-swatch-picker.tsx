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

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  const isCustom = value != null && !PALETTE.includes(value);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={cn(
            "size-7 rounded-md transition-transform hover:scale-105",
            value === c ? "ring-2 ring-ink ring-offset-1" : "ring-1 ring-black/10",
          )}
        />
      ))}
      {/* Custom color: a hidden native picker behind a rainbow swatch. */}
      <label
        title="Custom color"
        aria-label="Custom color"
        style={{
          background:
            "conic-gradient(from 90deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
        }}
        className={cn(
          "relative grid size-7 cursor-pointer place-items-center rounded-md transition-transform hover:scale-105",
          isCustom ? "ring-2 ring-ink ring-offset-1" : "ring-1 ring-black/10",
        )}
      >
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
