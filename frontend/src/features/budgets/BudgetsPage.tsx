import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { useCategoryLabel, useErrorText, useLocale, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { cn, vnd } from "../../lib/utils";
import type { BudgetAlert, BudgetAllocationStatus } from "../../types";
import { useCategories } from "../categories/hooks";
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

function monthRange(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  const short = new Date(y, m - 1, 1).toLocaleString(locale, { month: "short" });
  const last = new Date(y, m, 0).getDate();
  return `${short} 1 – ${short} ${last}`;
}

// Days left in the displayed month, relative to today (only for the current month).
function monthCountdown(month: string) {
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month === current) return { state: "current" as const, daysLeft: totalDays - now.getDate() + 1, totalDays };
  if (month < current) return { state: "past" as const, daysLeft: 0, totalDays };
  return { state: "future" as const, daysLeft: totalDays, totalDays };
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthFirstIso(month: string) {
  return `${month}-01`;
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultBudgetScope(month: string): "month" | "remaining" {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month === current && now.getDate() > 5 ? "remaining" : "month";
}
function effectiveFromForScope(month: string, scope: "month" | "remaining") {
  if (scope === "month") return monthFirstIso(month);
  const today = todayIso();
  return today.startsWith(`${month}-`) ? today : monthFirstIso(month);
}
function monthName(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: "long" });
}
function monthLabel(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: "long", year: "numeric" });
}
function dateLabel(value: string, locale: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function AllocationRow({ item, month, label }: { item: BudgetAllocationStatus; month: string; label: string }) {
  const upsert = useUpsertBudgetAllocation();
  const del = useDeleteBudgetAllocation();
  const t = useT();
  const locale = useLocale();
  const [amount, setAmount] = useState(item.amount);

  function save() {
    const next = amount.trim();
    if (!next || Number(next) <= 0 || Number(next) === Number(item.amount)) {
      setAmount(item.amount);
      return;
    }
    upsert.mutate(
      { month, category_id: item.category_id, amount: next, effective_from: item.effective_from },
      { onError: () => setAmount(item.amount) },
    );
  }

  const remaining = Number(item.remaining);
  const spentBefore = Number(item.spent_before_effective);
  return (
    <div className="border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
      <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[minmax(120px,1fr)_116px_96px_96px_56px_92px]">
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
        <span className="h-9 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#cbd5d1" }} />
        <p className="truncate font-medium text-ink">{label}</p>
      </div>
      <div>
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:hidden">
          {t("budgets.budgetLabel")}
        </span>
        <Input
          type="number"
          inputMode="numeric"
          className="nums h-9"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className="text-right sm:text-left">
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:hidden">
          {t("budgets.spent")}
        </span>
        <span className="nums text-sm font-medium text-ink">{vnd(item.spent)}</span>
      </div>
      <div className="text-right sm:text-left">
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:hidden">
          {t("budgets.left")}
        </span>
        <span className={cn("nums text-sm font-medium", remaining < 0 ? "text-expense" : "text-ink")}>
          {vnd(item.remaining)}
        </span>
      </div>
      <span className="nums hidden text-sm text-muted sm:inline">{item.usage_percent}%</span>
      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
        <Badge tone={ALERT_TONE[item.alert]}>{t(ALERT_LABEL[item.alert])}</Badge>
        <Button
          variant="danger"
          className="size-8 px-0"
          aria-label={t("budgets.removeAria")}
          disabled={del.isPending}
          onClick={() => del.mutate(item.id)}
        >
          <Trash2 size={15} />
        </Button>
      </div>
      </div>
      <div className="mt-2.5">
        <ProgressBar percent={item.usage_percent} alert={item.alert} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>{t("budgets.effectiveFrom", { date: dateLabel(item.effective_from, locale) })}</span>
        {spentBefore > 0 && (
          <span>{t("budgets.spentBefore", { amount: vnd(item.spent_before_effective) })}</span>
        )}
      </div>
    </div>
  );
}

function AddAllocation({ month, options }: { month: string; options: { id: string; name: string }[] }) {
  const upsert = useUpsertBudgetAllocation();
  const t = useT();
  const locale = useLocale();
  const errText = useErrorText();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState<"month" | "remaining">(() => defaultBudgetScope(month));

  useEffect(() => {
    setScope(defaultBudgetScope(month));
  }, [month]);

  function add() {
    if (!categoryId || !amount || Number(amount) <= 0) return;
    upsert.mutate(
      { month, category_id: categoryId, amount, effective_from: effectiveFromForScope(month, scope) },
      {
        onSuccess: () => {
          setCategoryId("");
          setAmount("");
          setScope(defaultBudgetScope(month));
        },
      },
    );
  }

  return (
    <div className="border-b border-line bg-canvas px-4 py-3.5 sm:px-5">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_190px_auto]">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={t("txn.colCategory")}>
          <option value="">{t("budgets.chooseCategory")}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          inputMode="numeric"
          className="nums"
          placeholder={t("budgets.budgetAmount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select value={scope} onChange={(e) => setScope(e.target.value as "month" | "remaining")} aria-label={t("budgets.effectiveScope")}>
          <option value="month">{t("budgets.scopeMonth")}</option>
          <option value="remaining">{t("budgets.scopeRemaining")}</option>
        </Select>
        <Button onClick={add} disabled={!categoryId || !amount || upsert.isPending}>
          <Plus size={16} /> {t("common.add")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {scope === "month"
          ? t("budgets.scopeMonthHint")
          : t("budgets.scopeRemainingHint", { date: dateLabel(effectiveFromForScope(month, scope), locale) })}
      </p>
      {upsert.isError && <p className="mt-2 text-xs text-expense">{errText(upsert.error)}</p>}
    </div>
  );
}

export function BudgetsPage() {
  const t = useT();
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  const [month, setMonth] = useState(thisMonth());
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
  const risks = items.filter((i) => i.alert !== "safe").slice(0, 3);
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

      <section className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Month summary rail */}
        <div className="grid gap-4">
          <Card className="rise space-y-3 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-medium text-ink">{t("budgets.thisMonth")}</h2>
              <span className="nums text-xs text-muted">{monthRange(month, locale)}</span>
            </div>
            {cd.state === "current" && (
              <p className="text-sm">
                <span className="nums font-semibold text-ink">{cd.daysLeft}</span>{" "}
                <span className="text-muted">
                  {t(cd.daysLeft !== 1 ? "budgets.daysLeftOther" : "budgets.daysLeftOne")}
                </span>
              </p>
            )}
            <dl className="space-y-2 border-t border-line pt-3">
              {([
                ["budgets.totalBudget", vnd(plan?.monthly_budget ?? 0)],
                ["budgets.spent", vnd(plan?.total_spent ?? 0)],
                ["budgets.left", vnd(plan?.total_remaining ?? 0)],
              ] as [TKey, string][]).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-muted">{t(label)}</dt>
                  <dd className="nums text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {monthlyBudget > 0 && (
              <div className="space-y-1.5 border-t border-line pt-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{t("budgets.spentOfBudget")}</span>
                  <span className="nums">{plan?.total_usage_percent ?? 0}%</span>
                </div>
                <ProgressBar percent={plan?.total_usage_percent ?? 0} alert={plan?.total_alert ?? "safe"} />
                {cd.state === "current" && cd.daysLeft > 0 && totalRemaining > 0 && (
                  <p className="text-xs text-muted">
                    {t(cd.daysLeft !== 1 ? "budgets.dailyPaceOther" : "budgets.dailyPaceOne", {
                      amount: vnd(dailyPace),
                      days: cd.daysLeft,
                    })}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="rise space-y-2 p-5" style={{ "--i": 1 } as React.CSSProperties}>
            <h2 className="font-medium text-ink">{t("budgets.availableMoney")}</h2>
            <p className="nums text-xl font-semibold text-ink">{vnd(available)}</p>
            <p className="text-xs text-muted">
              {t("budgets.availableHint", { month: monthName(month, locale) })}
            </p>
          </Card>
        </div>

        {/* Category budget board */}
        <Card className="rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
            <div>
              <h2 className="font-medium text-ink">{t("budgets.categoryBudgets")}</h2>
              <p className="text-xs text-muted">{t("budgets.categoryBudgetsHint")}</p>
            </div>
            {monthlyBudget > 0 && (
              <Badge tone="blue">{t("budgets.total", { amount: vnd(plan?.monthly_budget ?? 0) })}</Badge>
            )}
          </div>

          {isLoading ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{t("common.loading")}</p>
          ) : (
            <>
              {expenseOptions.length > 0 && <AddAllocation month={month} options={expenseOptions} />}
              {items.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted">
                  {t("budgets.noBudgetsYet", { month: monthName(month, locale) })}
                </p>
              )}
              {items.map((item) => (
                <AllocationRow key={item.id} item={item} month={month} label={labelFor(item.category_id, item.category)} />
              ))}
            </>
          )}
        </Card>

        {/* Preview rail */}
        <Card className="rise space-y-4 p-5 xl:sticky xl:top-24" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink">{t("budgets.dashboardPreview")}</h2>
            <Badge tone="blue">{t("budgets.preview")}</Badge>
          </div>
          {monthlyBudget > 0 ? (
            <p className="text-lg leading-relaxed text-ink">
              {t("budgets.previewSentence", {
                month: monthName(month, locale),
                budget: vnd(plan?.monthly_budget ?? 0),
                remaining: vnd(plan?.total_remaining ?? 0),
              })}
            </p>
          ) : (
            <p className="text-sm text-muted">{t("budgets.addPreviewHint")}</p>
          )}
          {risks.length > 0 && (
            <ul className="divide-y divide-line border-t border-line">
              {risks.map((r) => {
                const remaining = Number(r.remaining);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{labelFor(r.category_id, r.category)}</p>
                      <p className="nums text-xs text-muted">
                        {remaining < 0
                          ? t("budgets.overLimit", { amount: vnd(Math.abs(remaining)) })
                          : t("budgets.amountLeft", { amount: vnd(r.remaining) })}
                      </p>
                    </div>
                    <Badge tone={ALERT_TONE[r.alert]}>{t(ALERT_LABEL[r.alert])}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
