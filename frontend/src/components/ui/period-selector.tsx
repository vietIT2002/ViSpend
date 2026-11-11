import { useId } from "react";

import type { PeriodKey } from "../../lib/dates";
import { useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { Input } from "./input";
import { Segmented } from "./segmented";
import { Select } from "./select";

export type { PeriodKey } from "../../lib/dates";

const PRESETS: { key: PeriodKey; label: TKey }[] = [
  { key: "this_month", label: "period.this_month" },
  { key: "last_month", label: "period.last_month" },
  { key: "3m", label: "period.3m" },
  { key: "6m", label: "period.6m" },
  { key: "custom", label: "period.custom" },
];

/** Presets first, then a custom range. Controlled: the page keeps the choice in the URL. */
export function PeriodSelector({
  period,
  customFrom,
  customTo,
  onChange,
}: {
  period: PeriodKey;
  customFrom: string;
  customTo: string;
  onChange: (next: { period: PeriodKey; from?: string; to?: string }) => void;
}) {
  const t = useT();
  const selectId = useId();
  const fromId = useId();
  const toId = useId();
  const options = PRESETS.map((p) => ({ value: p.key, label: t(p.label) }));

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <div className="sm:hidden">
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {t("period.label")}
        </label>
        <Select id={selectId} value={period} onChange={(e) => onChange({ period: e.target.value as PeriodKey })}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <Segmented<PeriodKey>
        className="hidden sm:block"
        label={t("period.label")}
        labelVisible={false}
        value={period}
        options={options}
        onChange={(next) => onChange({ period: next })}
      />

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={fromId} className="mb-1.5 block text-sm font-medium text-ink">
              {t("period.from")}
            </label>
            <Input
              id={fromId}
              type="date"
              className="nums w-44"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onChange({ period: "custom", from: e.target.value, to: customTo })}
            />
          </div>
          <div>
            <label htmlFor={toId} className="mb-1.5 block text-sm font-medium text-ink">
              {t("period.to")}
            </label>
            <Input
              id={toId}
              type="date"
              className="nums w-44"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onChange({ period: "custom", from: customFrom, to: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
