import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { useErrorText, useLocale, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import {
  type BudgetScope,
  dateLabel,
  defaultBudgetScope,
  defaultCustomStart,
  effectiveFromForScope,
  isDateInMonth,
  monthFirstIso,
  monthLastIso,
} from "./dates";
import { useUpsertBudgetAllocation } from "./hooks";

const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted";

export function BudgetModal({
  open,
  onClose,
  month,
  options,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  options: { id: string; name: string }[];
}) {
  const upsert = useUpsertBudgetAllocation();
  const t = useT();
  const locale = useLocale();
  const errText = useErrorText();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState<BudgetScope>(() => defaultBudgetScope(month));
  const [customDate, setCustomDate] = useState(() => defaultCustomStart(month));
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset the form whenever it opens or the viewed month changes.
  useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setAmount("");
    setScope(defaultBudgetScope(month));
    setCustomDate(defaultCustomStart(month));
    setShowAdvanced(false);
  }, [open, month]);

  const effectiveFrom = effectiveFromForScope(month, scope, customDate);
  const customDateValid = scope !== "custom" || isDateInMonth(customDate, month);
  const canSubmit = Boolean(categoryId) && Number(amount) > 0 && customDateValid && !upsert.isPending;

  function submit() {
    if (!canSubmit) return;
    upsert.mutate(
      { month, category_id: categoryId, amount, effective_from: effectiveFrom },
      { onSuccess: onClose },
    );
  }

  const scopeHint =
    scope === "month"
      ? t("budgets.scopeMonthHint")
      : scope === "custom"
        ? t("budgets.scopeCustomHint", { date: dateLabel(effectiveFrom, locale) })
        : t("budgets.scopeRemainingHint", { date: dateLabel(effectiveFrom, locale) });

  const scopeSummary =
    scope === "month"
      ? t("budgets.scopeMonth")
      : scope === "remaining"
        ? t("budgets.scopeRemaining")
        : dateLabel(effectiveFrom, locale);

  return (
    <Modal open={open} onClose={onClose} title={t("budgets.addBudget")} align="start">
      <div className="space-y-4">
        <div>
          <label className={LABEL}>{t("txn.colCategory")}</label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t("budgets.chooseCategory")}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className={LABEL}>{t("budgets.budgetLabel")}</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₫</span>
            <Input
              type="number"
              inputMode="numeric"
              autoFocus
              className="nums h-12 pl-8 text-lg"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        {/* Advanced: when the budget starts. Collapsed by default to keep entry simple. */}
        <div className="rounded-lg border border-dashed border-line-strong p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            <span className="text-sm font-medium text-charcoal">{t("budgets.effectiveScope")}</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark">
              {scopeSummary}
              <ChevronDown size={14} className={cn("transition-transform", showAdvanced && "rotate-180")} />
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {(["month", "remaining", "custom"] as BudgetScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-semibold transition-colors",
                      scope === s
                        ? "border-brand bg-brand-soft text-brand-dark"
                        : "border-line-strong bg-surface text-charcoal hover:bg-black/[0.03]",
                    )}
                  >
                    {s === "month"
                      ? t("budgets.scopeMonth")
                      : s === "remaining"
                        ? t("budgets.scopeRemaining")
                        : t("budgets.scopeCustom")}
                  </button>
                ))}
              </div>
              {scope === "custom" && (
                <Input
                  type="date"
                  value={customDate}
                  min={monthFirstIso(month)}
                  max={monthLastIso(month)}
                  aria-label={t("budgets.startDate")}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              )}
              <p className="text-xs text-muted">{scopeHint}</p>
            </div>
          )}
        </div>

        {upsert.isError && <p className="text-xs text-expense">{errText(upsert.error)}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            <Plus size={16} /> {t("budgets.addBudget")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
