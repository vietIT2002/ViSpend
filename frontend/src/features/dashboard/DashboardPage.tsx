import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronRight, RefreshCw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { PageHeader } from "../../components/ui/page-header";
import { PeriodSelector } from "../../components/ui/period-selector";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState, ErrorState } from "../../components/ui/states";
import {
  daysInRange,
  isIsoDate,
  previousPeriod,
  rangeFor,
  singleMonth,
  weekdayIndex,
  type PeriodKey,
} from "../../lib/dates";
import {
  EMPTY,
  formatAmount,
  formatCompact,
  formatDate,
  formatDateRange,
  formatDateWithWeekday,
  formatDayMonth,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
  formatSignedMoney,
  formatSignedPercent,
  formatTime,
} from "../../lib/format";
import { useCategoryLabel, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { cn } from "../../lib/utils";
import { NeedsAttention } from "../budgets/BudgetPulse";
import { useCategories } from "../categories/hooks";
import { useTransactions } from "../transactions/hooks";
import { useCashflow, useCategorySpend, useSummary, useTrend } from "./hooks";

// Chart colours mirror the --color-chart-* tokens in index.css: one hue per
// meaning, grey for context, and line style as a second cue.
const CHART = {
  income: "#217a4b",
  expense: "#b4473f",
  net: "#1a1a18",
  muted: "#c9c8c3",
  grid: "#ecebe8",
  axis: "#65645f",
} as const;

const axisTick = { fontSize: 12, fill: CHART.axis } as const;
// Charts skip their grow-in animation when the OS asks for reduced motion.
const animate = !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
const tooltipStyle = {
  border: "1px solid #eaeaea",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "var(--font-sans)",
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.10)",
  padding: "8px 10px",
} as const;

const WEEKDAY_KEYS: TKey[] = [
  "dash.weekday.mon",
  "dash.weekday.tue",
  "dash.weekday.wed",
  "dash.weekday.thu",
  "dash.weekday.fri",
  "dash.weekday.sat",
  "dash.weekday.sun",
];
const PERIODS: PeriodKey[] = ["this_month", "last_month", "3m", "6m", "custom"];

type Granularity = "day" | "week" | "month";

const num = (value?: string | number | null) => (value == null ? 0 : Number(value));

/** A change against the previous period, or null when there is nothing to compare with. */
function change(current: number, previous: number) {
  return { diff: current - previous, ratio: previous !== 0 ? (current - previous) / Math.abs(previous) : null };
}

// ---------------------------------------------------------------- building blocks

function KpiTile({
  label,
  value,
  delta,
  loading,
  to,
  valueClass,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  loading: boolean;
  to?: string;
  valueClass?: string;
}) {
  const body = loading ? (
    <div aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  ) : (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      {/* Always the full value; a long one drops one type size instead of abbreviating. */}
      <p className={cn("nums mt-1 font-semibold leading-tight text-ink", value.length > 13 ? "text-xl" : "text-2xl", valueClass)}>
        {value}
      </p>
      {delta && <div className="nums mt-1.5 text-xs text-muted">{delta}</div>}
    </>
  );
  const box = "block min-h-28 rounded-md border border-line bg-surface p-4";
  return to && !loading ? (
    <Link to={to} className={cn(box, "transition-colors hover:bg-black/[0.02]")}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** "↑ +1.200.000 ₫ (+12,5%) vs October 2026". Neutral colour: whether up is good depends on the metric. */
function Delta({ text, ratio, up, vs }: { text: string; ratio?: number | null; up: boolean | null; vs: string }) {
  const Icon = up === null ? null : up ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      {Icon && <Icon size={12} aria-hidden="true" />}
      <span className="font-medium text-charcoal">{text}</span>
      {ratio != null && <span>({formatSignedPercent(ratio)})</span>}
      <span>{vs}</span>
    </span>
  );
}

interface TableSpec {
  columns: { label: string; numeric?: boolean }[];
  rows: { key: string; cells: ReactNode[] }[];
}

/**
 * A chart widget with its own loading, empty and error states, an axis unit,
 * and a Table view that gives the same numbers as text.
 */
function ChartCard({
  id,
  title,
  description,
  loading,
  error,
  onRetry,
  retrying,
  empty,
  table,
  height = 280,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  retrying?: boolean;
  empty: { title: string; body: string } | null;
  table: TableSpec;
  height?: number;
  children: ReactNode;
}) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  const ready = !loading && !error && !empty;
  return (
    <Card className="flex flex-col" role="region" aria-labelledby={`${id}-title`}>
      <CardHeader
        title={title}
        titleId={`${id}-title`}
        description={description}
        action={
          ready && (
            <Button
              variant="ghost"
              className="h-8 px-2 text-sm sm:h-8"
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? t("dash.showChart") : t("dash.showTable")}
            </Button>
          )
        }
      />
      <div className="p-4" style={{ minHeight: height + 32 }}>
        {loading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : error ? (
          <ErrorState message={t("dash.widgetError", { widget: title })} onRetry={onRetry} retrying={retrying} />
        ) : empty ? (
          <EmptyState title={empty.title} body={empty.body} />
        ) : showTable ? (
          <div className="relative overflow-auto" style={{ maxHeight: height }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left">
                <tr className="h-10 border-b border-line">
                  {table.columns.map((c) => (
                    <th key={c.label} scope="col" className={cn("px-3 font-medium text-muted", c.numeric && "text-right")}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((row) => (
                  <tr key={row.key} className="h-10">
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={cn("whitespace-nowrap px-3", table.columns[i]?.numeric && "nums text-right")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    </Card>
  );
}

/** Legend text keeps body contrast; the swatch beside it carries the series colour. */
const legendText = (value: string) => <span style={{ color: CHART.axis }}>{value}</span>;

const yLabel = (value: string) => ({
  value,
  angle: -90,
  position: "insideLeft" as const,
  offset: 12,
  style: { fontSize: 12, fill: CHART.axis, textAnchor: "middle" as const },
});
const xLabel = (value: string) => ({
  value,
  position: "insideBottom" as const,
  offset: -4,
  style: { fontSize: 12, fill: CHART.axis },
});

// ---------------------------------------------------------------- page

export function DashboardPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const categoryLabel = useCategoryLabel();
  const [params, setParams] = useSearchParams();

  // The period lives in the URL so a shared link shows the same numbers.
  const period: PeriodKey = PERIODS.includes(params.get("period") as PeriodKey)
    ? (params.get("period") as PeriodKey)
    : "this_month";
  const customFrom = isIsoDate(params.get("from")) ? params.get("from")! : "";
  const customTo = isIsoDate(params.get("to")) ? params.get("to")! : "";
  const range =
    period === "custom" && customFrom && customTo && customFrom <= customTo
      ? { from: customFrom, to: customTo }
      : rangeFor(period === "custom" ? "this_month" : period);
  const prevRange = previousPeriod(range.from, range.to);
  const prevMonth = singleMonth(prevRange.from, prevRange.to);
  const vsLabel = t("dash.vsPeriod", {
    period: prevMonth ? formatMonth(prevMonth) : formatDateRange(prevRange.from, prevRange.to),
  });
  const flowGranularity: Granularity = daysInRange(range.from, range.to) > 70 ? "week" : "day";

  function onPeriodChange(next: { period: PeriodKey; from?: string; to?: string }) {
    setParams(
      () => {
        const p = new URLSearchParams();
        if (next.period !== "this_month") p.set("period", next.period);
        if (next.period === "custom") {
          // Start a custom range from the dates on screen, so it is valid at once.
          p.set("from", next.from || range.from);
          p.set("to", next.to || range.to);
        }
        return p;
      },
      { replace: true },
    );
  }

  const cur = useSummary(range.from, range.to);
  const prev = useSummary(prevRange.from, prevRange.to);
  const spend = useCategorySpend(range.from, range.to);
  const flow = useTrend(flowGranularity, range.from, range.to);
  const daily = useTrend("day", range.from, range.to);
  const cash = useCashflow(6);
  const recent = useTransactions({ from: range.from, to: range.to, page_size: 5 });
  const expenseCount = useTransactions({ from: range.from, to: range.to, type: "expense", page_size: 1 });
  const prevCount = useTransactions({ from: prevRange.from, to: prevRange.to, page_size: 1 });
  const prevExpenseCount = useTransactions({ from: prevRange.from, to: prevRange.to, type: "expense", page_size: 1 });
  const { data: cats = [] } = useCategories();

  const categoryById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const catName = (id: string, fallback?: string) => {
    const c = categoryById.get(id);
    return c ? categoryLabel(c) : (fallback ?? t("dash.unknownCategory"));
  };

  // ---- KPI values
  const income = num(cur.data?.total_income);
  const expense = num(cur.data?.total_expense);
  const balance = num(cur.data?.balance);
  const pIncome = num(prev.data?.total_income);
  const pExpense = num(prev.data?.total_expense);
  const pBalance = num(prev.data?.balance);
  const savings = income > 0 ? balance / income : null;
  const pSavings = pIncome > 0 ? (pIncome - pExpense) / pIncome : null;
  const count = recent.data?.total ?? 0;
  const pCount = prevCount.data?.total ?? 0;
  const eCount = expenseCount.data?.total ?? 0;
  const peCount = prevExpenseCount.data?.total ?? 0;
  const avgExpense = eCount > 0 ? expense / eCount : null;
  const pAvgExpense = peCount > 0 ? pExpense / peCount : null;
  const summaryLoading = cur.isLoading || prev.isLoading;
  const summaryFailed = (cur.isError && !cur.data) || (prev.isError && !prev.data);

  const moneyDelta = (current: number, previous: number) => {
    const c = change(current, previous);
    return <Delta text={formatSignedMoney(c.diff)} ratio={c.ratio} up={c.diff === 0 ? null : c.diff > 0} vs={vsLabel} />;
  };

  const listHref = (extra: Record<string, string> = {}) =>
    `/transactions?${new URLSearchParams({ ...extra, from: range.from, to: range.to }).toString()}`;

  // ---- chart data
  const periodLabel = (p: string, g: Granularity) =>
    g === "month" ? formatMonth(p.slice(0, 7)) : g === "week" ? t("dash.weekShort", { week: p.split("-W")[1] ?? p }) : formatDayMonth(p);

  const flowData = (flow.data ?? []).map((row) => ({
    period: periodLabel(row.period, flowGranularity),
    income: num(row.income),
    expenseBar: -num(row.expense),
    expense: num(row.expense),
    net: num(row.income) - num(row.expense),
  }));
  const hasFlow = flowData.some((d) => d.income !== 0 || d.expense !== 0);

  const categoryRows = (spend.data ?? [])
    .map((r) => ({
      key: r.category_id,
      category: catName(r.category_id, r.category),
      current: num(r.total),
      previous: num(r.prev_total),
      percent: r.percent,
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 8);

  const cashData = (cash.data ?? []).map((row) => ({
    period: periodLabel(row.period, "month"),
    income: num(row.income),
    expense: num(row.expense),
    net: num(row.income) - num(row.expense),
  }));
  const hasCash = cashData.some((d) => d.income !== 0 || d.expense !== 0);

  // Weekday pattern and top days come from the server's daily totals, so they
  // cover every transaction in the period (not just one page of them).
  const dailyExpense = (daily.data ?? []).map((row) => ({ date: row.period, total: num(row.expense) })).filter((d) => d.total > 0);
  const weekdayData = WEEKDAY_KEYS.map((key, i) => ({
    day: t(key),
    expense: dailyExpense.filter((d) => weekdayIndex(d.date) === i).reduce((sum, d) => sum + d.total, 0),
  }));
  const topDays = [...dailyExpense].sort((a, b) => b.total - a.total).slice(0, 5);
  const maxTopDay = Math.max(1, ...topDays.map((d) => d.total));

  const updatedAt = Math.max(cur.dataUpdatedAt, spend.dataUpdatedAt, flow.dataUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    ]);
    setRefreshing(false);
  }

  const money = (v: number) => formatMoney(v);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("dash.title")}
        meta={
          <span className="nums inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{formatDateRange(range.from, range.to)}</span>
            <span aria-hidden="true">·</span>
            <span>{t("dash.comparedWith", { period: prevMonth ? formatMonth(prevMonth) : formatDateRange(prevRange.from, prevRange.to) })}</span>
            {updatedAt > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("dash.updatedAt", { time: formatTime(updatedAt) })}</span>
              </>
            )}
            <Button
              variant="ghost"
              className="h-7 px-1.5 text-sm sm:h-7"
              onClick={() => void refresh()}
              loading={refreshing}
              aria-label={t("dash.refresh")}
              title={t("dash.refresh")}
            >
              {!refreshing && <RefreshCw size={14} aria-hidden="true" />}
            </Button>
          </span>
        }
        actions={<PeriodSelector period={period} customFrom={customFrom || range.from} customTo={customTo || range.to} onChange={onPeriodChange} />}
      />

      {/* KPI tiles */}
      {summaryFailed ? (
        <Card>
          <ErrorState
            message={t("dash.summaryError")}
            onRetry={() => {
              void cur.refetch();
              void prev.refetch();
            }}
            retrying={cur.isFetching || prev.isFetching}
          />
        </Card>
      ) : (
        <section aria-label={t("dash.kpiLabel")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <KpiTile
            label={t("dash.netBalance")}
            value={formatMoney(balance)}
            valueClass={balance < 0 ? "text-expense" : undefined}
            loading={summaryLoading}
            delta={moneyDelta(balance, pBalance)}
          />
          <KpiTile
            label={t("dash.income")}
            value={formatMoney(income)}
            loading={summaryLoading}
            delta={moneyDelta(income, pIncome)}
            to={listHref({ type: "income" })}
          />
          <KpiTile
            label={t("dash.expense")}
            value={formatMoney(expense)}
            loading={summaryLoading}
            delta={moneyDelta(expense, pExpense)}
            to={listHref({ type: "expense" })}
          />
          <KpiTile
            label={t("dash.savingsRate")}
            value={savings === null ? EMPTY : formatPercent(savings)}
            valueClass={savings !== null && savings < 0 ? "text-expense" : undefined}
            loading={summaryLoading}
            delta={
              savings !== null && pSavings !== null ? (
                <Delta
                  text={t("dash.points", { value: formatNumber((savings - pSavings) * 100, { maximumFractionDigits: 1, signDisplay: "exceptZero" }) })}
                  up={savings === pSavings ? null : savings > pSavings}
                  vs={vsLabel}
                />
              ) : (
                <span>{income > 0 ? t("dash.noComparison") : t("dash.savingsNoIncome")}</span>
              )
            }
          />
          <KpiTile
            label={t("dash.transactions")}
            value={formatNumber(count)}
            loading={recent.isLoading || prevCount.isLoading}
            delta={
              <Delta
                text={formatNumber(count - pCount, { signDisplay: "exceptZero" })}
                ratio={change(count, pCount).ratio}
                up={count === pCount ? null : count > pCount}
                vs={vsLabel}
              />
            }
            to={listHref()}
          />
          <KpiTile
            label={t("dash.avgExpense")}
            value={avgExpense === null ? EMPTY : formatMoney(avgExpense)}
            loading={summaryLoading || expenseCount.isLoading || prevExpenseCount.isLoading}
            delta={
              avgExpense !== null && pAvgExpense !== null ? (
                moneyDelta(avgExpense, pAvgExpense)
              ) : (
                <span>{t("dash.noComparison")}</span>
              )
            }
          />
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ChartCard
          id="cash-flow"
          title={t("dash.cashFlow")}
          description={flowGranularity === "day" ? t("dash.cashFlowDaily") : t("dash.cashFlowWeekly")}
          loading={flow.isLoading}
          error={flow.isError && !flow.data}
          onRetry={() => void flow.refetch()}
          retrying={flow.isFetching}
          empty={hasFlow ? null : { title: t("dash.noCashFlow"), body: t("dash.noCashFlowBody") }}
          table={{
            columns: [
              { label: flowGranularity === "day" ? t("dash.colDay") : t("dash.colWeek") },
              { label: t("dash.colIncomeVnd"), numeric: true },
              { label: t("dash.colExpenseVnd"), numeric: true },
              { label: t("dash.colNetVnd"), numeric: true },
            ],
            rows: flowData.map((d) => ({
              key: d.period,
              cells: [d.period, formatAmount(d.income), formatAmount(d.expense), formatAmount(d.net)],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={flowData} margin={{ top: 8, right: 8, left: 8, bottom: 16 }} barGap={2}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <ReferenceLine y={0} stroke={CHART.muted} />
              <XAxis
                dataKey="period"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                label={xLabel(flowGranularity === "day" ? t("dash.colDay") : t("dash.colWeek"))}
                minTickGap={16}
              />
              <YAxis
                tick={axisTick}
                tickFormatter={(v: number) => formatCompact(v)}
                tickLine={false}
                axisLine={false}
                width={64}
                label={yLabel(t("dash.axisVnd"))}
              />
              <Tooltip
                formatter={(value, name) => [money(Math.abs(Number(value))), name]}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} formatter={legendText} />
              <Bar dataKey="income" isAnimationActive={animate} name={t("dash.legend.income")} fill={CHART.income} radius={[2, 2, 0, 0]} maxBarSize={12} />
              <Bar dataKey="expenseBar" isAnimationActive={animate} name={t("dash.legend.expense")} fill={CHART.expense} radius={[0, 0, 2, 2]} maxBarSize={12} />
              <Line isAnimationActive={animate} type="monotone" dataKey="net" name={t("dash.legend.net")} stroke={CHART.net} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <NeedsAttention from={range.from} to={range.to} net={balance} netReady={Boolean(cur.data)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          id="by-category"
          title={t("dash.spendingByCategory")}
          description={t("dash.byCategoryHint")}
          loading={spend.isLoading}
          error={spend.isError && !spend.data}
          onRetry={() => void spend.refetch()}
          retrying={spend.isFetching}
          empty={categoryRows.length ? null : { title: t("dash.noSpending"), body: t("dash.noSpendingBody") }}
          height={Math.max(200, categoryRows.length * 40)}
          table={{
            columns: [
              { label: t("txn.colCategory") },
              { label: t("dash.colThisPeriodVnd"), numeric: true },
              { label: t("dash.colPreviousVnd"), numeric: true },
              { label: t("dash.colShare"), numeric: true },
            ],
            rows: categoryRows.map((r) => ({
              key: r.key,
              cells: [r.category, formatAmount(r.current), formatAmount(r.previous), formatPercent(r.percent / 100)],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryRows} layout="vertical" margin={{ top: 0, right: 88, left: 8, bottom: 16 }} barGap={2}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                tickFormatter={(v: number) => formatCompact(v)}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                label={xLabel(t("dash.axisVnd"))}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                label={yLabel(t("txn.colCategory"))}
              />
              <Tooltip formatter={(value, name) => [money(Number(value)), name]} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} formatter={legendText} />
              <Bar dataKey="current" isAnimationActive={animate} name={t("dash.thisPeriod")} fill={CHART.expense} maxBarSize={14} radius={[0, 2, 2, 0]}>
                <LabelList
                  dataKey="current"
                  position="right"
                  formatter={(v) => formatAmount(Number(v))}
                  style={{ fontSize: 12, fill: CHART.axis }}
                />
              </Bar>
              <Bar dataKey="previous" isAnimationActive={animate} name={vsLabel} fill={CHART.muted} maxBarSize={8} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          id="six-months"
          title={t("dash.incomeVsExpense")}
          description={t("dash.sixMonthsHint")}
          loading={cash.isLoading}
          error={cash.isError && !cash.data}
          onRetry={() => void cash.refetch()}
          retrying={cash.isFetching}
          empty={hasCash ? null : { title: t("dash.noMonthlyTrend"), body: t("dash.noMonthlyTrendBody") }}
          table={{
            columns: [
              { label: t("dash.colMonth") },
              { label: t("dash.colIncomeVnd"), numeric: true },
              { label: t("dash.colExpenseVnd"), numeric: true },
              { label: t("dash.colNetVnd"), numeric: true },
            ],
            rows: cashData.map((d) => ({
              key: d.period,
              cells: [d.period, formatAmount(d.income), formatAmount(d.expense), formatAmount(d.net)],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashData} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.grid }} label={xLabel(t("dash.colMonth"))} />
              <YAxis
                tick={axisTick}
                tickFormatter={(v: number) => formatCompact(v)}
                tickLine={false}
                axisLine={false}
                width={64}
                label={yLabel(t("dash.axisVnd"))}
              />
              <Tooltip formatter={(value, name) => [money(Number(value)), name]} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} formatter={legendText} />
              <Line isAnimationActive={animate} type="monotone" dataKey="income" name={t("dash.legend.income")} stroke={CHART.income} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line isAnimationActive={animate} type="monotone" dataKey="expense" name={t("dash.legend.expense")} stroke={CHART.expense} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5 }} />
              <Line isAnimationActive={animate} type="monotone" dataKey="net" name={t("dash.legend.net")} stroke={CHART.net} strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <ChartCard
          id="weekday"
          title={t("dash.weeklyPattern")}
          description={t("dash.weekdayHint")}
          loading={daily.isLoading}
          error={daily.isError && !daily.data}
          onRetry={() => void daily.refetch()}
          retrying={daily.isFetching}
          empty={dailyExpense.length ? null : { title: t("dash.noWeekdayPattern"), body: t("dash.noWeekdayPatternBody") }}
          height={240}
          table={{
            columns: [{ label: t("dash.colWeekday") }, { label: t("dash.colExpenseVnd"), numeric: true }],
            rows: weekdayData.map((d) => ({ key: d.day, cells: [d.day, formatAmount(d.expense)] })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: 8, bottom: 16 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.grid }} label={xLabel(t("dash.colWeekday"))} />
              <YAxis
                tick={axisTick}
                tickFormatter={(v: number) => formatCompact(v)}
                tickLine={false}
                axisLine={false}
                width={56}
                label={yLabel(t("dash.axisVnd"))}
              />
              <Tooltip formatter={(value, name) => [money(Number(value)), name]} contentStyle={tooltipStyle} />
              <Bar dataKey="expense" isAnimationActive={animate} name={t("dash.legend.expense")} fill={CHART.expense} radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader title={t("dash.topDays")} description={t("dash.topDaysHint")} />
          {daily.isError && !daily.data ? (
            <ErrorState message={t("dash.widgetError", { widget: t("dash.topDays") })} onRetry={() => void daily.refetch()} />
          ) : daily.isLoading ? (
            <div className="space-y-3 p-4" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : topDays.length === 0 ? (
            <EmptyState title={t("dash.noSpendingDays")} body={t("dash.noSpendingDaysBody")} />
          ) : (
            <ol className="divide-y divide-line">
              {topDays.map((day) => (
                <li key={day.date}>
                  <Link
                    to={`/transactions?type=expense&from=${day.date}&to=${day.date}`}
                    className="grid grid-cols-[minmax(0,1fr)_72px_auto_16px] items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-black/[0.02]"
                  >
                    <time dateTime={day.date} className="nums truncate text-charcoal">
                      {formatDateWithWeekday(day.date)}
                    </time>
                    <span className="h-1.5 rounded-full bg-black/[0.06]" aria-hidden="true">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(6, (day.total / maxTopDay) * 100)}%`, backgroundColor: CHART.expense }}
                      />
                    </span>
                    <span className="nums text-right font-medium text-ink">{formatMoney(day.total)}</span>
                    <ChevronRight size={16} className="text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            title={t("dash.recentActivity")}
            action={
              <Link to={listHref()} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
                {t("dash.viewAll")}
              </Link>
            }
          />
          {recent.isError && !recent.data ? (
            <ErrorState message={t("dash.widgetError", { widget: t("dash.recentActivity") })} onRetry={() => void recent.refetch()} />
          ) : recent.isLoading ? (
            <div className="space-y-3 p-4" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : (recent.data?.items ?? []).length === 0 ? (
            <EmptyState
              title={t("dash.noTransactions")}
              body={t("dash.noTransactionsBody")}
              action={
                <Link to="/transactions" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
                  {t("dash.goToTransactions")}
                </Link>
              }
            />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left">
                  <tr className="h-10">
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colDate")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colCategory")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colNote")}</th>
                    <th scope="col" className="px-3 text-right font-medium text-muted">{t("txn.colAmountVnd")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(recent.data?.items ?? []).map((txn) => (
                    <tr key={txn.id} className="h-10 whitespace-nowrap">
                      <td className="nums px-3 text-charcoal">
                        <time dateTime={txn.occurred_on}>{formatDate(txn.occurred_on)}</time>
                      </td>
                      <td className="px-3 font-medium text-ink">
                        <span className="block max-w-40 truncate">{catName(txn.category_id)}</span>
                      </td>
                      <td className="px-3 text-charcoal">
                        <span className="block max-w-48 truncate" title={txn.note ?? undefined}>
                          {txn.note?.trim() || <span className="text-muted">{EMPTY}</span>}
                        </span>
                      </td>
                      <td className={cn("nums px-3 text-right font-medium", txn.type === "income" ? "text-brand" : "text-ink")}>
                        {formatAmount(txn.type === "income" ? num(txn.amount) : -num(txn.amount), { signDisplay: "exceptZero" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
