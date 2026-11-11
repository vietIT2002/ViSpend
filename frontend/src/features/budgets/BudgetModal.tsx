import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FieldError, Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { MoneyInput } from "../../components/ui/money-input";
import { Select } from "../../components/ui/select";
import { InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { formatDate, formatMoney, formatMonth } from "../../lib/format";
import { useErrorText, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import {
  type BudgetScope,
  defaultBudgetScope,
  defaultCustomStart,
  effectiveFromForScope,
  isDateInMonth,
  monthFirstIso,
  monthLastIso,
} from "./dates";
import { useUpsertBudgetAllocation } from "./hooks";

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
  const toast = useToast();
  const errText = useErrorText();
  const ids = { category: useId(), amount: useId(), date: useId() };
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState<BudgetScope>(() => defaultBudgetScope(month));
  const [customDate, setCustomDate] = useState(() => defaultCustomStart(month));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; amount?: string; date?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<keyof typeof ids | null>(null);

  // Reset the form whenever it opens or the viewed month changes.
  useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setAmount("");
    setScope(defaultBudgetScope(month));
    setCustomDate(defaultCustomStart(month));
    setShowAdvanced(false);
    setErrors({});
    setServerError(null);
  }, [open, month]);

  // Move focus to the first invalid field once it is in the DOM (the date field lives in a collapsible section).
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(ids[focusTarget])?.focus();
    setFocusTarget(null);
  }, [focusTarget, showAdvanced, ids]);

  const effectiveFrom = effectiveFromForScope(month, scope, customDate);

  async function submit() {
    if (upsert.isPending) return;
    const next: typeof errors = {};
    if (!categoryId) next.category = t("budgets.categoryError");
    if (!amount || Number(amount) <= 0) next.amount = t("budgets.amountError");
    if (scope === "custom" && !isDateInMonth(customDate, month))
      next.date = t("errors.budget_effective_from_outside_month");
    setErrors(next);
    setServerError(null);
    const first = (["category", "amount", "date"] as const).find((k) => next[k]);
    if (first) {
      if (first === "date") setShowAdvanced(true);
      setFocusTarget(first);
      return;
    }
    const category = options.find((o) => o.id === categoryId)?.name ?? "";
    try {
      await upsert.mutateAsync({ month, category_id: categoryId, amount, effective_from: effectiveFrom });
      toast(t("budgets.toastSet", { category, month: formatMonth(month), amount: formatMoney(amount) }));
      onClose();
    } catch (err) {
      setServerError(errText(err));
    }
  }

  const scopeHint =
    scope === "month"
      ? t("budgets.scopeMonthHint")
      : scope === "custom"
        ? t("budgets.scopeCustomHint", { date: formatDate(effectiveFrom) })
        : t("budgets.scopeRemainingHint", { date: formatDate(effectiveFrom) });

  const scopeSummary =
    scope === "month"
      ? t("budgets.scopeMonth")
      : scope === "remaining"
        ? t("budgets.scopeRemaining")
        : formatDate(effectiveFrom);

  return (
    <Modal open={open} onClose={onClose} title={t("budgets.addBudget")} align="start">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <Label htmlFor={ids.category} required>
            {t("txn.colCategory")}
          </Label>
          <Select
            id={ids.category}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? `${ids.category}-error` : undefined}
          >
            <option value="">{t("budgets.chooseCategory")}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError id={`${ids.category}-error`} message={errors.category} />
        </div>

        <div>
          <Label htmlFor={ids.amount} required>
            {t("budgets.monthlyLimit")}
          </Label>
          <MoneyInput
            id={ids.amount}
            autoFocus
            value={amount}
            onValueChange={setAmount}
            placeholder="0"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? `${ids.amount}-error` : undefined}
          />
          <FieldError id={`${ids.amount}-error`} message={errors.amount} />
        </div>

        {/* Advanced: when the budget starts. Collapsed by default to keep entry simple. */}
        <div className="rounded border border-dashed border-line-strong p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={showAdvanced || scope === "custom" && Boolean(errors.date)}
            onClick={() => setShowAdvanced((s) => !s)}
          >
            <span className="text-sm font-medium text-ink">{t("budgets.effectiveScope")}</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-brand-dark">
              {scopeSummary}
              <ChevronDown size={16} aria-hidden="true" className={cn("transition-transform", showAdvanced && "rotate-180")} />
            </span>
          </button>

          {(showAdvanced || (scope === "custom" && Boolean(errors.date))) && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t("budgets.effectiveScope")}>
                {(["month", "remaining", "custom"] as BudgetScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={scope === s}
                    onClick={() => setScope(s)}
                    className={cn(
                      "h-10 rounded border text-sm font-medium transition-colors sm:h-9",
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
                <div>
                  <Label htmlFor={ids.date} required>
                    {t("budgets.startDate")}
                  </Label>
                  <Input
                    id={ids.date}
                    type="date"
                    className="nums"
                    value={customDate}
                    min={monthFirstIso(month)}
                    max={monthLastIso(month)}
                    aria-invalid={errors.date ? true : undefined}
                    aria-describedby={errors.date ? `${ids.date}-error` : undefined}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                  <FieldError id={`${ids.date}-error`} message={errors.date} />
                </div>
              )}
              <p className="text-sm text-muted">{scopeHint}</p>
            </div>
          )}
        </div>

        {serverError && <InlineAlert tone="error">{serverError}</InlineAlert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {!upsert.isPending && <Plus size={16} aria-hidden="true" />}
            {t("budgets.addBudget")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
