import { cn } from "../../lib/utils";

const PALETTE = [
  "#3cb371",
  "#2e8b57",
  "#9f2f2d",
  "#956400",
  "#1f6c9f",
  "#7a5c9e",
  "#b5651d",
  "#5b6770",
];

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
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
    </div>
  );
}

export const DEFAULT_CATEGORY_COLOR = PALETTE[0];
