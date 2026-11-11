import { Check, ChevronLeft, ChevronRight, Copy, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FieldError } from "../../components/ui/label";
import { MoneyInput } from "../../components/ui/money-input";
import { PageHeader } from "../../components/ui/page-header";
import { Skeleton, TableSkeletonRows } from "../../components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import {
  currentMonth,
  daysInMonth,
  isIsoMonth,
  shiftMonth,
  todayIso,
} from "../../lib/dates";
import { capitalize, formatAmount, formatDate, formatMoney, formatMonth, formatNumber, formatPercent, toWholeAmount } from "../../lib/format";
import { useCategoryLabel, useErrorText, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { forcedState } from "../../lib/use-unsaved-changes";
import type { BudgetAlert, BudgetAllocationStatus, BudgetPlan } from "../../types";
import { useCategories } from "../categories/hooks";
import { BudgetModal } from "./BudgetModal";
import { ALERT_LABEL, ALERT_ORDER, ALERT_TONE } from "./alerts";
import { useBudgetPlan, useCopyBudgetPlan, useDeleteBudgetAllocation, useUpsertBudgetAllocation } from "./hooks";

const BAR_COLOR: Record<BudgetAlert, string> = {
  safe: "bg-brand",
  watch: "bg-warn",
  tight: "bg-warn",
  over: "bg-expense",
};

function UsageBar({ percent, alert, className }: { percent: number; alert: BudgetAlert; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-black/[0.08]", className)} aria-hidden="true">
      <div className={cn("h-full rounded-full", BAR_COLOR[alert])} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function BudgetsPage() {
  const t = useT();
  const toast = useToast();
  const errText = useErrorText();
  const categoryLabel = useCategoryLabel();
  const [params, setParams] = useSearchParams();
  const forced = forcedState(params);
  const month = isIsoMonth(params.get("month")) ? params.get("month")! : currentMonth();
  const prevMonth = shiftMonth(month, -1);

  const planQuery = useBudgetPlan(month);
  const { data: cats = [], isLoading: catsLoading } = useCategories();
  const copyPlan = useCopyBudgetPlan();
  const del = useDeleteBudgetAllocation();
  const [copyError, setCopyError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [removing, setRemoving] = useState<BudgetAllocationStatus | null>(null);

  const plan = forced ? undefined : planQuery.data;
  const loading = forced === "loading" || (!forced && planQuery.isLoading);
  const failed = forced === "error" || (!forced && planQuery.isError && !planQuery.data);
  const items = useMemo(
    () =>
      [...(forced === "empty" ? [] : (plan?.items ?? []))].sort(
        (a, b) => ALERT_ORDER[a.alert] - ALERT_ORDER[b.alert] || b.usage_percent - a.usage_percent,
      ),
    [plan, forced],
  );

  const labelFor = (categoryId: string, fallback: string) => {
    const cat = cats.find((c) => c.id === categoryId);
    return cat ? categoryLabel(cat) : fallback;
  };
  const allocatedIds = new Set(items.map((i) => i.category_id));
  const expenseCats = cats.filter((c) => c.type === "expense");
  const addOptions = expenseCats
    .filter((c) => !allocatedIds.has(c.id))
    .map((c) => ({ id: c.id, name: categoryLabel(c) }));

  function setMonth(next: string) {
    setCopyError(null);
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === currentMonth()) p.delete("month");
        else p.set("month", next);
        return p;
      },
      { replace: true },
    );
  }

  async function copyFromPrevious() {
    setCopyError(null);
    try {
      const result = (await copyPlan.mutateAsync({ from_month: prevMonth, to_month: month })) as BudgetPlan;
      const added = Math.max(0, result.items.length - items.length);
      toast(
        added > 0
          ? t("budgets.toastCopied", { count: formatNumber(added), from: formatMonth(prevMonth) })
          : t("budgets.toastNothingNew", { from: formatMonth(prevMonth) }),
      );
    } catch (err) {
      setCopyError(errText(err));
    }
  }

  // Month facts for the summary line.
  const isCurrent = month === currentMonth();
  const daysLeft = isCurrent ? daysInMonth(month) - Number(todayIso().slice(8)) + 1 : 0;
  const totalRemaining = Number(plan?.total_remaining ?? 0);
  const monthlyBudget = Number(plan?.monthly_budget ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("budgets.title")}
        actions={
          <>
            <div className="flex items-center gap-1" role="group" aria-label={t("budgets.monthLabel")}>
              <Button
                variant="secondary"
                className="size-10 px-0 sm:size-9"
                aria-label={t("budgets.prevMonthNamed", { month: formatMonth(prevMonth) })}
                onClick={() => setMonth(prevMonth)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <span className="nums inline-flex h-10 min-w-40 items-center justify-center rounded border border-line-strong bg-surface px-3 text-sm font-medium text-ink sm:h-9" aria-live="polite">
                {capitalize(formatMonth(month))}
              </span>
              <Button
                variant="secondary"
                className="size-10 px-0 sm:size-9"
                aria-label={t("budgets.nextMonthNamed", { month: formatMonth(shiftMonth(month, 1)) })}
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
              {!isCurrent && (
                <Button variant="ghost" onClick={() => setMonth(currentMonth())}>
                  {t("budgets.thisMonth")}
                </Button>
              )}
            </div>
            <Button variant="secondary" loading={copyPlan.isPending} onClick={() => void copyFromPrevious()}>
              {!copyPlan.isPending && <Copy size={16} aria-hidden="true" />}
              {t("budgets.copyFrom", { month: formatMonth(prevMonth) })}
            </Button>
          </>
        }
      />

      {copyError && (
        <InlineAlert tone="error" onDismiss={() => setCopyError(null)}>
          {copyError}
        </InlineAlert>
      )}

      {/* One summary line for the month, not a row of KPI cards. */}
      {!failed && (
        <Card className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                <SummaryItem label={t("budgets.totalBudget")} value={formatMoney(plan?.monthly_budget ?? 0)} />
                <SummaryItem label={t("budgets.spent")} value={formatMoney(plan?.total_spent ?? 0)} />
                <SummaryItem
                  label={t("budgets.left")}
                  value={formatMoney(totalRemaining)}
                  valueClass={totalRemaining < 0 ? "text-expense" : undefined}
                />
                <div>
                  <dt className="text-sm text-muted">{t("budgets.used")}</dt>
                  <dd className="mt-0.5 flex items-center gap-2">
                    <span className="nums text-base font-semibold text-ink">
                      {monthlyBudget > 0 ? formatPercent((plan?.total_usage_percent ?? 0) / 100, { maximumFractionDigits: 0 }) : "—"}
                    </span>
                    {monthlyBudget > 0 && plan && (
                      <UsageBar percent={plan.total_usage_percent} alert={plan.total_alert} className="w-16" />
                    )}
                  </dd>
                </div>
                <SummaryItem
                  label={t("budgets.daysLeft")}
                  value={isCurrent ? formatNumber(daysLeft) : "—"}
                  hint={!isCurrent ? t(month < currentMonth() ? "budgets.monthEnded" : "budgets.monthNotStarted") : undefined}
                />
                <SummaryItem
                  label={t("budgets.dailyPace")}
                  value={isCurrent && daysLeft > 0 && totalRemaining > 0 ? formatMoney(totalRemaining / daysLeft) : "—"}
                  hint={isCurrent && totalRemaining > 0 ? t("budgets.perDay") : undefined}
                />
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                <span className="font-medium text-ink">{t("budgets.availableMoney")}: </span>
                <span className="nums font-semibold text-ink">{formatMoney(plan?.available_money ?? 0)}</span>
                {" · "}
                {t("budgets.availableHint", { month: formatMonth(month) })}
              </p>
            </>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={t("budgets.categoryBudgets")}
          description={t("budgets.categoryBudgetsHint")}
          action={
            <Button onClick={() => setModalOpen(true)} disabled={loading || addOptions.length === 0}>
              <Plus size={16} aria-hidden="true" />
              {t("budgets.addBudget")}
            </Button>
          }
        />

        {!failed && !loading && !catsLoading && (
          expenseCats.length === 0 ? (
            <InlineAlert tone="info" className="m-4">
              {t("budgets.noExpenseCategories")}{" "}
              <Link to="/categories" className="font-medium underline underline-offset-2">
                {t("budgets.openCategories")}
              </Link>
            </InlineAlert>
          ) : addOptions.length === 0 ? (
            <p className="border-b border-line bg-canvas px-4 py-3 text-sm text-muted">{t("budgets.allCategoriesBudgeted")}</p>
          ) : null
        )}

        {failed ? (
          <ErrorState
            message={t("budgets.loadError")}
            onRetry={() => void planQuery.refetch()}
            retrying={planQuery.isFetching}
          />
        ) : !loading && items.length === 0 ? (
          <EmptyState
            title={t("budgets.emptyTitle", { month: formatMonth(month) })}
            body={t("budgets.emptyBody")}
            action={
              <Button variant="secondary" loading={copyPlan.isPending} onClick={() => void copyFromPrevious()}>
                {t("budgets.copyFrom", { month: formatMonth(prevMonth) })}
              </Button>
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-line bg-canvas text-left">
                <tr className="h-10">
                  <th scope="col" className="sticky left-0 bg-canvas px-3 font-medium text-muted">{t("txn.colCategory")}</th>
                  <th scope="col" className="px-3 text-right font-medium text-muted">{t("budgets.colBudget")}</th>
                  <th scope="col" className="px-3 text-right font-medium text-muted">{t("budgets.colSpent")}</th>
                  <th scope="col" className="px-3 text-right font-medium text-muted">{t("budgets.colLeft")}</th>
                  <th scope="col" className="px-3 text-right font-medium text-muted">{t("budgets.used")}</th>
                  <th scope="col" className="px-3 font-medium text-muted">{t("budgets.colStatus")}</th>
                  <th scope="col" className="px-3 font-medium text-muted">{t("budgets.colCountsFrom")}</th>
                  <th scope="col" className="w-12 px-3">
                    <span className="sr-only">{t("txn.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line" aria-busy={loading}>
                {loading ? (
                  <TableSkeletonRows columns={8} rows={5} />
                ) : (
                  items.map((item) => (
                    <AllocationRow
                      key={item.id}
                      item={item}
                      month={month}
                      label={labelFor(item.category_id, item.category)}
                      onRemove={() => setRemoving(item)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BudgetModal open={modalOpen} onClose={() => setModalOpen(false)} month={month} options={addOptions} />

      <ConfirmDialog
        open={Boolean(removing)}
        title={
          removing
            ? t("budgets.removeTitle", { category: labelFor(removing.category_id, removing.category), month: formatMonth(month) })
            : ""
        }
        confirmLabel={t("budgets.removeConfirm")}
        onConfirm={async () => {
          if (!removing) return;
          const category = labelFor(removing.category_id, removing.category);
          await del.mutateAsync(removing.id);
          toast(t("budgets.toastRemoved", { category, month: formatMonth(month) }));
        }}
        onClose={() => setRemoving(null)}
      >
        <p>{t("budgets.removeBody", { month: formatMonth(month) })}</p>
      </ConfirmDialog>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("nums mt-0.5 text-base font-semibold text-ink", valueClass)}>
        {value}
        {hint && <span className="ml-1 text-sm font-normal text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

function AllocationRow({
  item,
  month,
  label,
  onRemove,
}: {
  item: BudgetAllocationStatus;
  month: string;
  label: string;
  onRemove: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const errText = useErrorText();
  const upsert = useUpsertBudgetAllocation();
  const inputId = useId();
  const [amount, setAmount] = useState(toWholeAmount(item.amount));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const focused = useRef(false);

  // Follow server changes (copy, other tabs) unless the user is typing.
  useEffect(() => {
    if (!focused.current) setAmount(toWholeAmount(item.amount));
  }, [item.amount]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function save() {
    focused.current = false;
    const next = amount.trim();
    if (next === toWholeAmount(item.amount)) return setError(null);
    if (!next || Number(next) <= 0) return setError(t("budgets.amountError"));
    setError(null);
    try {
      await upsert.mutateAsync({ month, category_id: item.category_id, amount: next, effective_from: item.effective_from });
      setSaved(true);
      toast(t("budgets.toastSet", { category: label, month: formatMonth(month), amount: formatMoney(next) }));
    } catch (err) {
      // Keep what the user typed and say why it was refused.
      setError(errText(err));
    }
  }

  const remaining = Number(item.remaining);
  const spentBefore = Number(item.spent_before_effective);
  const errorId = `${inputId}-error`;

  return (
    <tr className="align-top">
      <td className="sticky left-0 bg-surface px-3 py-2.5">
        <span className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#9b9a95" }} aria-hidden="true" />
          <span className="max-w-48 truncate font-medium text-ink" title={label}>
            {label}
          </span>
        </span>
      </td>
      <td className="px-3 py-1">
        <div className="flex items-center justify-end gap-1.5">
          <span className="grid size-4 place-items-center" aria-hidden="true">
            {upsert.isPending ? (
              <Loader2 size={14} className="animate-spin text-muted motion-reduce:animate-none" />
            ) : saved ? (
              <Check size={14} className="text-brand" />
            ) : null}
          </span>
          <label htmlFor={inputId} className="sr-only">
            {t("budgets.budgetFor", { category: label })}
          </label>
          <MoneyInput
            id={inputId}
            value={amount}
            onValueChange={setAmount}
            onFocus={() => (focused.current = true)}
            onBlur={() => void save()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setAmount(toWholeAmount(item.amount));
                setError(null);
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-8 w-36 sm:h-8"
          />
        </div>
        <span role="status" className="sr-only">
          {saved ? t("common.saved") : ""}
        </span>
        {error && (
          <div className="flex justify-end">
            <FieldError id={errorId} message={error} />
          </div>
        )}
      </td>
      <td className="nums px-3 py-2.5 text-right text-ink">{formatAmount(item.spent)}</td>
      <td className={cn("nums px-3 py-2.5 text-right font-medium", remaining < 0 ? "text-expense" : "text-ink")}>
        {formatAmount(remaining)}
      </td>
      <td className="px-3 py-2.5">
        <span className="flex items-center justify-end gap-2">
          <UsageBar percent={item.usage_percent} alert={item.alert} className="w-20" />
          <span className="nums w-12 text-right text-charcoal">{formatPercent(item.usage_percent / 100, { maximumFractionDigits: 0 })}</span>
        </span>
      </td>
      <td className="px-3 py-2">
        <Badge tone={ALERT_TONE[item.alert]}>{t(ALERT_LABEL[item.alert])}</Badge>
      </td>
      <td className="nums whitespace-nowrap px-3 py-2.5 text-charcoal">
        <span className="inline-flex items-center gap-1">
          <time dateTime={item.effective_from}>{formatDate(item.effective_from)}</time>
          {spentBefore > 0 && (
            <span title={t("budgets.spentBefore", { amount: formatMoney(spentBefore) })} className="text-muted">
              <Info size={14} aria-hidden="true" />
              <span className="sr-only">{t("budgets.spentBefore", { amount: formatMoney(spentBefore) })}</span>
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-1 text-right">
        <Button
          variant="danger"
          className="size-8 px-0 sm:size-8"
          aria-label={t("budgets.removeAria", { category: label })}
          title={t("budgets.removeAria", { category: label })}
          onClick={onRemove}
        >
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}
