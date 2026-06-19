import { useEffect, useState } from "react";

import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { Input } from "./input";
import { Select } from "./select";

export type PeriodKey = "this_month" | "last_month" | "3m" | "6m" | "custom";

const PRESETS: { key: PeriodKey; label: TKey }[] = [
  { key: "this_month", label: "period.this_month" },
  { key: "last_month", label: "period.last_month" },
  { key: "3m", label: "period.3m" },
  { key: "6m", label: "period.6m" },
  { key: "custom", label: "period.custom" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function rangeFor(key: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = (yy: number, mm: number) => iso(new Date(yy, mm, 1));
  const end = (yy: number, mm: number) => iso(new Date(yy, mm + 1, 0));
  switch (key) {
    case "this_month":
      return { from: start(y, m), to: end(y, m) };
    case "last_month":
      return { from: start(y, m - 1), to: end(y, m - 1) };
    case "3m":
      return { from: start(y, m - 2), to: end(y, m) };
    case "6m":
      return { from: start(y, m - 5), to: end(y, m) };
    case "custom":
      return { from: customFrom, to: customTo };
  }
}

export function PeriodSelector({
  onChange,
}: {
  onChange: (range: { from: string; to: string }) => void;
}) {
  const t = useT();
  const [key, setKey] = useState<PeriodKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (key === "custom" && (!customFrom || !customTo)) return;
    onChange(rangeFor(key, customFrom, customTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, customFrom, customTo]);

  const showCustom = key === "custom";

  return (
    <div className="w-full max-w-full sm:w-auto">
      <div className="sm:hidden">
        <Select value={key} onChange={(e) => setKey(e.target.value as PeriodKey)} aria-label={t("period.label")}>
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {t(p.label)}
            </option>
          ))}
        </Select>
      </div>

      <div className="hidden w-max max-w-full rounded-md border border-line bg-surface p-0.5 sm:inline-flex sm:items-center sm:gap-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setKey(p.key)}
            className={cn(
              "whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium leading-5 transition-colors",
              key === p.key ? "bg-brand text-white" : "text-muted hover:bg-black/[0.035] hover:text-ink",
            )}
          >
            {t(p.label)}
          </button>
        ))}
      </div>

      {/* Smoothly expand/collapse the custom range instead of popping in. */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out motion-reduce:transition-none",
          showCustom ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 lg:max-w-xl">
            <Input
              type="date"
              className="nums h-9"
              aria-label={t("period.from")}
              tabIndex={showCustom ? 0 : -1}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-sm text-muted">{t("period.to")}</span>
            <Input
              type="date"
              className="nums h-9"
              aria-label={t("period.to")}
              tabIndex={showCustom ? 0 : -1}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
