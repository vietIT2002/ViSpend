import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useCategoryLabel, useLocale, useT } from "../../lib/i18n";
import { cn, vnd } from "../../lib/utils";
import type { BudgetAlert, BudgetAllocationStatus } from "../../types";
import { useCategories } from "../categories/hooks";
import { BudgetModal } from "./BudgetModal";
import {
  dateLabel,
  monthCountdown,
  monthLabel,
  monthName,
  monthRange,
  shiftMonth,
  thisMonth,
} from "./dates";
import {
  useBudgetPlan,
  useCopyBudgetPlan,
  useDeleteBudgetAllocation,
  useUpsertBudgetAllocation,
} from "./hooks";

const ALERT_TONE: Record<BudgetAlert, "green" | "yellow" | "red"> = {
  safe: "green",
  watch: "yellow",
  tight: "red",
  over: "red",
};
const ALERT_LABEL: Record<BudgetAlert, `budgets.alert.${BudgetAlert}`> = {
  safe: "budgets.alert.safe",
  watch: "budgets.alert.watch",
  tight: "budgets.alert.tight",
  over: "budgets.alert.over",
};
const BAR_COLOR: Record<BudgetAlert, string> = {
  safe: "bg-brand",
  watch: "bg-warn",
  tight: "bg-expense",
  over: "bg-expense",
};

function ProgressBar({ percent, alert }: { percent: number; alert: BudgetAlert }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", BAR_COLOR[alert])}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function AllocationRow({ item, month, label }: { item: BudgetAllocationStatus; month: string; label: string }) {
  const upsert = useUpsertBudgetAllocation();
  const del = useDeleteBudgetAllocation();
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(item.amount);

  function cancel() {
    setAmount(item.amount);
    setEditing(false);
  }
  function save() {
    const next = amount.trim();
    if (!next || Number(next) <= 0) return cancel();
    if (Number(next) === Number(item.amount)) return setEditing(false);
    upsert.mutate(
      { month, category_id: item.category_id, amount: next, effective_from: item.effective_from },
      { onSuccess: () => setEditing(false), onError: () => setAmount(item.amount) },
    );
  }

  const remaining = Number(item.remaining);
  const spentBefore = Number(item.spent_before_effective);

  return (
    <div className={cn("border-b border-line px-4 py-4 last:border-0 sm:px-5", editing && "bg-brand-soft/60")}>
      <div className="grid grid-cols-1 items-center gap-x-5 gap-y-3 sm:grid-cols-[minmax(140px,1.3fr)_minmax(0,2fr)_120px_auto]">
        {/* category */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#cbd5d1" }} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{label}</p>
            <p className="truncate text-xs text-muted">
              {t("budgets.effectiveFrom", { date: dateLabel(item.effective_from, locale) })}
              {spentBefore > 0 && ` · ${t("budgets.spentBefore", { amount: vnd(item.spent_before_effective) })}`}
            </p>
          </div>
        </div>

        {/* progress, or inline amount editor with explicit Save/Cancel */}
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₫</span>
              <Input
                type="number"
                inputMode="numeric"
                autoFocus
                className="nums h-9 pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") cancel();
                }}
              />
            </div>
            <Button className="h-9" onClick={save} disabled={upsert.isPending}>
              {t("common.save")}
            </Button>
            <Button variant="secondary" className="h-9" onClick={cancel}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="nums font-semibold text-ink">{vnd(item.spent)}</span>
              <span className="nums text-muted">/ {vnd(item.amount)}</span>
            </div>
            <ProgressBar percent={item.usage_percent} alert={item.alert} />
          </div>
        )}

        {/* remaining */}
        <div className="text-left sm:text-right">
          <p className="text-[11px] uppercase tracking-[0.05em] text-muted">
            {remaining < 0 ? t("budgets.alert.over") : t("budgets.left")}
          </p>
          <p className={cn("nums text-sm font-bold", remaining < 0 ? "text-expense" : "text-ink")}>
            {remaining < 0 ? `−${vnd(Math.abs(remaining))}` : vnd(item.remaining)}
          </p>
        </div>

        {/* status + actions */}
        <div className="flex items-center justify-end gap-2">
          <Badge tone={ALERT_TONE[item.alert]}>{t(ALERT_LABEL[item.alert])}</Badge>
          {!editing && (
            <>
              <Button
                variant="secondary"
                className="size-8 px-0"
                aria-label={t("common.edit")}
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="danger"
                className="size-8 px-0"
                aria-label={t("budgets.removeAria")}
                disabled={del.isPending}
                onClick={() => del.mutate(item.id)}
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, neg }: { label: string; value: string; neg?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("nums text-xl font-bold tracking-tight", neg ? "text-expense" : "text-ink")}>{value}</p>
    </div>
  );
}

export function BudgetsPage() {
  const t = useT();
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  const [month, setMonth] = useState(thisMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const { data: plan, isLoading } = useBudgetPlan(month);
  const { data: cats = [] } = useCategories();
  const copyPlan = useCopyBudgetPlan();

  const available = Number(plan?.available_money ?? 0);
  const monthlyBudget = Number(plan?.monthly_budget ?? 0);
  const items = plan?.items ?? [];
  const allocatedIds = useMemo(() => new Set(items.map((i) => i.category_id)), [items]);
  const expenseOptions = useMemo(
    () =>
      cats
        .filter((c) => c.type === "expense" && !allocatedIds.has(c.id))
        .map((c) => ({ id: c.id, name: categoryLabel(c) })),
    [cats, allocatedIds, categoryLabel],
  );
  const labelFor = (categoryId: string, fallback: string) => {
    const cat = cats.find((c) => c.id === categoryId);
    return cat ? categoryLabel(cat) : fallback;
  };
  const cd = monthCountdown(month);
  const totalRemaining = Number(plan?.total_remaining ?? 0);
  const dailyPace = cd.daysLeft > 0 ? totalRemaining / cd.daysLeft : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("budgets.heading")}</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">{t("budgets.title")}</h1>
          <p className="text-sm text-muted">{t("budgets.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="size-10 px-0" aria-label={t("budgets.prevMonth")} onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="nums inline-flex h-10 items-center rounded-md border border-line bg-surface px-3 text-sm font-medium">
            {monthLabel(month, locale)}
          </span>
          <Button variant="secondary" className="size-10 px-0" aria-label={t("budgets.nextMonth")} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="secondary"
            disabled={copyPlan.isPending}
            onClick={() => copyPlan.mutate({ from_month: shiftMonth(month, -1), to_month: month })}
          >
            <Copy size={15} /> {t("budgets.copyLastMonth")}
          </Button>
        </div>
      </header>

      {/* Month summary — a calm horizontal band of KPIs + overall pace */}
      <Card className="rise p-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
          <Kpi label={t("budgets.totalBudget")} value={vnd(plan?.monthly_budget ?? 0)} />
          <Kpi label={t("budgets.spent")} value={vnd(plan?.total_spent ?? 0)} />
          <Kpi label={t("budgets.left")} value={vnd(plan?.total_remaining ?? 0)} neg={totalRemaining < 0} />
          {cd.state === "current" ? (
            <div className="lg:border-l lg:border-line lg:pl-5">
              <p className="text-xs text-muted">
                <span className="nums font-semibold text-ink">{cd.daysLeft}</span>{" "}
                {t(cd.daysLeft !== 1 ? "budgets.daysLeftOther" : "budgets.daysLeftOne")}
              </p>
              {monthlyBudget > 0 && cd.daysLeft > 0 && totalRemaining > 0 && (
                <p className="nums mt-0.5 text-sm font-semibold text-ink">
                  {t(cd.daysLeft !== 1 ? "budgets.dailyPaceOther" : "budgets.dailyPaceOne", {
                    amount: vnd(dailyPace),
                    days: cd.daysLeft,
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="lg:border-l lg:border-line lg:pl-5">
              <p className="text-xs text-muted">{monthRange(month, locale)}</p>
            </div>
          )}
        </div>

        {monthlyBudget > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-line pt-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t("budgets.spentOfBudget")}</span>
              <span className="nums">{plan?.total_usage_percent ?? 0}%</span>
            </div>
            <ProgressBar percent={plan?.total_usage_percent ?? 0} alert={plan?.total_alert ?? "safe"} />
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          {t("budgets.availableMoney")}:{" "}
          <span className="nums font-semibold text-charcoal">{vnd(available)}</span>{" "}
          <span className="text-muted">· {t("budgets.availableHint", { month: monthName(month, locale) })}</span>
        </p>
      </Card>

      {/* Category budgets board */}
      <Card className="rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
          <div>
            <h2 className="font-medium text-ink">{t("budgets.categoryBudgets")}</h2>
            <p className="text-xs text-muted">{t("budgets.categoryBudgetsHint")}</p>
          </div>
          <Button onClick={() => setModalOpen(true)} disabled={expenseOptions.length === 0}>
            <Plus size={16} /> {t("budgets.addBudget")}
          </Button>
        </div>

        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-muted">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {t("budgets.noBudgetsYet", { month: monthName(month, locale) })}
          </p>
        ) : (
          items.map((item) => (
            <AllocationRow key={item.id} item={item} month={month} label={labelFor(item.category_id, item.category)} />
          ))
        )}
      </Card>

      <BudgetModal open={modalOpen} onClose={() => setModalOpen(false)} month={month} options={expenseOptions} />
    </div>
  );
}
