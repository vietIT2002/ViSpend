import { format } from "date-fns";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Percent,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { PeriodSelector, rangeFor } from "../../components/ui/period-selector";
import { Skeleton } from "../../components/ui/skeleton";
import { cn, vnd } from "../../lib/utils";
import { BudgetPulse } from "../budgets/BudgetPulse";
import { useCategories } from "../categories/hooks";
import { useTransactions } from "../transactions/hooks";
import { previousPeriod, useCashflow, useCategorySpend, useSummary, useTrend } from "./hooks";

const tooltipStyle = {
  border: "1px solid #eaeaea",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  boxShadow: "0 8px 24px rgb(47 52 55 / 0.08)",
  padding: "8px 10px",
} as const;

const axisTick = { fontSize: 11, fill: "#787774" } as const;
const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const categoryPalette = ["#b94d47", "#d97941", "#e4b54d", "#6b97d8", "#8f64c8", "#64b7b1"];

type ChangeTone = "good" | "bad" | "neutral";
type ChartGranularity = "day" | "week" | "month";

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function rangeDays(from: string, to: string) {
  return Math.max(1, Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1);
}

function numberValue(value?: string) {
  return value ? Number(value) : 0;
}

function shortVnd(value: number | string) {
  const n = Number(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

function compactMoney(value: number) {
  return `${shortVnd(value)} VND`;
}

function signedNumber(value: number, digits = 1) {
  const normalized = Math.abs(value) < 0.05 ? 0 : value;
  const abs = Math.abs(normalized).toFixed(digits).replace(/\.0$/, "");
  if (normalized > 0) return `+${abs}`;
  if (normalized < 0) return `-${abs}`;
  return abs;
}

function signedMoney(value: number) {
  if (Math.abs(value) < 1) return "0 VND";
  return `${value > 0 ? "+" : "-"}${vnd(Math.abs(value))}`;
}

function signedInteger(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits).replace(/\.0$/, "")}%`;
}

function formatRange(from: string, to: string) {
  return `${format(parseDate(from), "MMM dd")} - ${format(parseDate(to), "MMM dd, yyyy")}`;
}

function periodLabel(period: string, granularity: ChartGranularity) {
  if (granularity === "month") return format(parseDate(`${period}-01`), "MMM");
  if (granularity === "week") return period.replace("-W", " W");
  return format(parseDate(period), "MMM dd");
}

function getChange(current: number, previous: number, goodWhenUp: boolean) {
  const diff = current - previous;
  const pct = Math.abs(previous) > 0 ? (diff / Math.abs(previous)) * 100 : null;
  const tone: ChangeTone =
    Math.abs(diff) < 1 ? "neutral" : diff > 0 === goodWhenUp ? "good" : "bad";
  return { diff, pct, tone };
}

function changeTextClass(tone: ChangeTone) {
  if (tone === "good") return "text-brand-dark";
  if (tone === "bad") return "text-expense";
  return "text-muted";
}

function changeBadgeClass(tone: ChangeTone) {
  if (tone === "good") return "bg-brand-soft text-brand-dark";
  if (tone === "bad") return "bg-pastel-red text-expense";
  return "bg-black/[0.05] text-muted";
}

function rise(i: number) {
  return { "--i": i } as CSSProperties;
}

function ChangeSummary({
  change,
  formatDiff = signedMoney,
  showPct = true,
}: {
  change: ReturnType<typeof getChange>;
  formatDiff?: (value: number) => string;
  showPct?: boolean;
}) {
  const Icon = change.diff >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn("nums inline-flex items-center gap-1 text-sm font-medium", changeTextClass(change.tone))}>
        <Icon size={14} strokeWidth={2} />
        {formatDiff(change.diff)}
      </span>
      {showPct && change.pct !== null && (
        <span className={cn("nums rounded px-1.5 py-0.5 text-xs font-medium", changeBadgeClass(change.tone))}>
          {signedNumber(change.pct)}%
        </span>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
  change,
  valueTone = "text-ink",
  formatDiff,
  loading,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: "green" | "red" | "blue" | "yellow";
  change: ReturnType<typeof getChange>;
  valueTone?: string;
  formatDiff?: (value: number) => string;
  loading: boolean;
}) {
  const toneClass = {
    green: "bg-brand-soft text-brand-dark",
    red: "bg-pastel-red text-expense",
    blue: "bg-pastel-blue text-pastel-blue-ink",
    yellow: "bg-pastel-yellow text-pastel-yellow-ink",
  }[tone];

  return (
    <Card className="rise p-4 sm:p-5" style={rise(0)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid size-9 place-items-center rounded-full", toneClass)}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <p className="text-xs text-muted">vs previous period</p>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-40" />
        ) : (
          <>
            <p className={cn("nums mt-2 text-2xl font-semibold leading-tight sm:text-3xl", valueTone)}>{value}</p>
            <div className="mt-3">
              <ChangeSummary change={change} formatDiff={formatDiff} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full min-h-48 place-items-center rounded-lg border border-line bg-canvas px-5 text-center">
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-pastel-red bg-pastel-red px-4 py-3 text-sm text-expense">
      {message}
    </div>
  );
}

function InsightRow({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: "green" | "red" | "blue" | "yellow";
}) {
  const toneClass = {
    green: "bg-brand-soft text-brand-dark",
    red: "bg-pastel-red text-expense",
    blue: "bg-pastel-blue text-pastel-blue-ink",
    yellow: "bg-pastel-yellow text-pastel-yellow-ink",
  }[tone];

  return (
    <div className="flex gap-3">
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-full", toneClass)}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<{ from: string; to: string }>(() => rangeFor("this_month", "", ""));
  const prevRange = previousPeriod(range.from, range.to);
  const days = rangeDays(range.from, range.to);
  const flowGranularity: ChartGranularity = days > 70 ? "week" : "day";

  const cur = useSummary(range.from, range.to);
  const prev = useSummary(prevRange.from, prevRange.to);
  const spend = useCategorySpend(range.from, range.to);
  const flow = useTrend(flowGranularity, range.from, range.to);
  const cash = useCashflow(6);
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    from: range.from,
    to: range.to,
    page_size: 100,
  });
  const { data: prevTransactions } = useTransactions({
    from: prevRange.from,
    to: prevRange.to,
    page_size: 100,
  });
  const { data: cats = [] } = useCategories();

  const categoryNames = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const catName = (id: string) => categoryNames.get(id) ?? "Unknown category";

  const s = cur.data;
  const p = prev.data;
  const income = numberValue(s?.total_income);
  const expense = numberValue(s?.total_expense);
  const balance = numberValue(s?.balance);
  const prevIncome = numberValue(p?.total_income);
  const prevExpense = numberValue(p?.total_expense);
  const prevBalance = numberValue(p?.balance);
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0;
  const loadingSummary = cur.isLoading || prev.isLoading || !s;

  const transactionItems = transactions?.items ?? [];
  const recentItems = transactionItems.slice(0, 5);
  const transactionCount = transactions?.total ?? transactionItems.length;
  const prevTransactionCount = prevTransactions?.total ?? 0;
  const averageTransaction = transactionCount > 0 ? (income + expense) / transactionCount : 0;
  const prevAverageTransaction =
    prevTransactionCount > 0 ? (prevIncome + prevExpense) / prevTransactionCount : 0;

  const rows = spend.data ?? [];
  const categoryChart = rows.slice(0, 6).map((r, index) => ({
    category: r.category,
    current: Number(r.total),
    previous: Number(r.prev_total),
    percent: r.percent,
    color: r.color ?? categoryPalette[index % categoryPalette.length],
  }));
  const topCategory = categoryChart[0];

  const flowData = (flow.data ?? []).map((t) => {
    const incomeValue = Number(t.income);
    const expenseValue = Number(t.expense);
    return {
      period: periodLabel(t.period, flowGranularity),
      income: incomeValue,
      expenseBar: -expenseValue,
      expenseValue,
      net: incomeValue - expenseValue,
    };
  });

  const cashData = (cash.data ?? []).map((t) => ({
    period: periodLabel(t.period, "month"),
    income: Number(t.income),
    expense: Number(t.expense),
    net: Number(t.income) - Number(t.expense),
  }));

  const weeklyData = useMemo(() => {
    const totals = weekLabels.map((day) => ({ day, expense: 0 }));
    transactionItems.forEach((txn) => {
      if (txn.type !== "expense") return;
      const weekday = (parseDate(txn.occurred_on).getDay() + 6) % 7;
      totals[weekday].expense += Number(txn.amount);
    });
    return totals;
  }, [transactionItems]);

  const topDays = useMemo(() => {
    const totals = new Map<string, number>();
    transactionItems.forEach((txn) => {
      if (txn.type !== "expense") return;
      totals.set(txn.occurred_on, (totals.get(txn.occurred_on) ?? 0) + Number(txn.amount));
    });
    return Array.from(totals.entries())
      .map(([date, total]) => ({ date, label: format(parseDate(date), "MMM dd"), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactionItems]);

  const maxTopDay = Math.max(...topDays.map((day) => day.total), 1);
  const netChange = getChange(balance, prevBalance, true);
  const incomeChange = getChange(income, prevIncome, true);
  const expenseChange = getChange(expense, prevExpense, false);
  const savingsChange = getChange(savingsRate, prevSavingsRate, true);
  const txnCountChange = getChange(transactionCount, prevTransactionCount, true);
  const averageTxnChange = getChange(averageTransaction, prevAverageTransaction, false);

  const insights = [
    {
      icon: balance >= 0 ? TrendingUp : TrendingDown,
      title: balance >= 0 ? "Cash flow is positive" : "Cash flow needs attention",
      body:
        balance >= 0
          ? "You earned more than you spent in this period."
          : "Expenses are higher than income in this period.",
      tone: balance >= 0 ? "green" : "red",
    },
    {
      icon: ShoppingCart,
      title: topCategory ? `${topCategory.category} is the top spending category` : "No spending category yet",
      body: topCategory
        ? `It accounts for ${formatPercent(topCategory.percent, 0)} of recorded expenses.`
        : "Add expenses to see which category takes the most cash.",
      tone: topCategory ? "yellow" : "blue",
    },
    {
      icon: expenseChange.tone === "good" ? TrendingDown : TrendingUp,
      title: expenseChange.diff <= 0 ? "Expense decreased" : "Expense increased",
      body:
        expenseChange.pct !== null
          ? `Expense changed by ${signedNumber(expenseChange.pct)}% compared with the previous period.`
          : "Record more transactions to compare expenses with the previous period.",
      tone: expenseChange.tone === "good" ? "green" : expenseChange.tone === "bad" ? "red" : "blue",
    },
    {
      icon: Percent,
      title: savingsRate >= 20 ? "Savings rate is healthy" : "Savings rate is low",
      body: `Current savings rate is ${formatPercent(savingsRate)} for this period.`,
      tone: savingsRate >= 20 ? "green" : "red",
    },
  ] satisfies {
    icon: LucideIcon;
    title: string;
    body: string;
    tone: "green" | "red" | "blue" | "yellow";
  }[];

  return (
    <div className="space-y-5">
      <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(520px,auto)] xl:items-start">
        <div className="max-w-3xl">
          <h1 className="display text-4xl text-ink sm:text-5xl">Know what changed before it becomes a habit.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Track your cash flow, understand category spend, and review the transactions that changed your month.
          </p>
        </div>
        <div className="flex flex-col gap-2 xl:items-end">
          <PeriodSelector onChange={setRange} />
          <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted xl:justify-end">
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3">
              <CalendarDays size={14} strokeWidth={2} />
              {formatRange(range.from, range.to)}
            </span>
            <span className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3">
              Compare: previous period
            </span>
          </div>
        </div>
      </header>

      {(cur.isError || prev.isError) && <InlineError message="Could not load dashboard summary. Please try again." />}

      <BudgetPulse from={range.from} to={range.to} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Net Balance"
          value={vnd(balance)}
          icon={Wallet}
          tone="green"
          change={netChange}
          valueTone={balance < 0 ? "text-expense" : "text-ink"}
          loading={loadingSummary}
        />
        <MetricCard
          title="Income"
          value={vnd(income)}
          icon={ArrowDownRight}
          tone="green"
          change={incomeChange}
          valueTone="text-ink"
          loading={loadingSummary}
        />
        <MetricCard
          title="Expense"
          value={vnd(expense)}
          icon={ArrowUpRight}
          tone="red"
          change={expenseChange}
          valueTone="text-ink"
          loading={loadingSummary}
        />
        <MetricCard
          title="Savings Rate"
          value={formatPercent(savingsRate)}
          icon={Percent}
          tone="blue"
          change={savingsChange}
          formatDiff={(value) => `${signedNumber(value)} pp`}
          valueTone={savingsRate >= 0 ? "text-ink" : "text-expense"}
          loading={loadingSummary}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr_0.55fr]">
        <Card className="rise p-4 sm:p-5" style={rise(1)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Cash flow overview</h2>
            <Badge tone="neutral">{flowGranularity === "day" ? "Daily" : "Weekly"}</Badge>
          </div>
          <div className="mt-4 h-[320px]">
            {flow.isLoading ? (
              <Skeleton className="h-full" />
            ) : flowData.length === 0 ? (
              <EmptyPanel
                title="No cash flow yet"
                body="Income and expense bars appear after transactions are recorded."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={flowData} margin={{ top: 12, right: 10, left: -8, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke="#f0efec" vertical={false} />
                  <ReferenceLine y={0} stroke="#d8d7d2" />
                  <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: "#eaeaea" }} />
                  <YAxis tick={axisTick} tickFormatter={shortVnd} tickLine={false} axisLine={false} width={54} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Expense" ? vnd(Math.abs(Number(value))) : vnd(Number(value)),
                      name,
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend iconType="rect" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="#9ac7a8" radius={[3, 3, 0, 0]} barSize={9} />
                  <Bar dataKey="expenseBar" name="Expense" fill="#d99087" radius={[0, 0, 3, 3]} barSize={9} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#1a1a18"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#ffffff", strokeWidth: 1.5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="rise p-4 sm:p-5" style={rise(2)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Spending by category</h2>
            <Badge tone={categoryChart.length ? "green" : "neutral"}>Amount</Badge>
          </div>
          {spend.isLoading ? (
            <Skeleton className="mt-4 h-[320px]" />
          ) : categoryChart.length === 0 ? (
            <div className="mt-4 h-[320px]">
              <EmptyPanel title="No spending in this period" body="Add expenses to see category ranking." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_126px]">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} layout="vertical" margin={{ top: 8, right: 54, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#f0efec" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickFormatter={shortVnd}
                      tickLine={false}
                      axisLine={{ stroke: "#eaeaea" }}
                    />
                    <YAxis type="category" dataKey="category" width={108} tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => vnd(Number(value))} contentStyle={tooltipStyle} />
                    <Bar dataKey="current" name="Amount" radius={[0, 5, 5, 0]} barSize={13}>
                      {categoryChart.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="current"
                        position="right"
                        formatter={(value) => compactMoney(Number(value))}
                        fontSize={11}
                        fill="#787774"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="hidden lg:block">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChart}
                        dataKey="current"
                        nameKey="category"
                        innerRadius={34}
                        outerRadius={58}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {categoryChart.map((entry) => (
                          <Cell key={entry.category} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => vnd(Number(value))} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
                  <p className="text-xs text-muted">Top category</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{topCategory?.category}</p>
                  <p className="nums mt-1 text-xs text-muted">{topCategory ? vnd(topCategory.current) : "0 VND"}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="rise p-4 sm:p-5" style={rise(3)}>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-muted" strokeWidth={2} />
            <h2 className="font-semibold text-ink">Transaction volume</h2>
          </div>
          {transactionsLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <>
              <p className="nums mt-5 text-4xl font-semibold leading-none text-ink">{transactionCount}</p>
              <p className="mt-1 text-sm text-muted">Transactions</p>
              <div className="mt-4">
                <ChangeSummary change={txnCountChange} formatDiff={signedInteger} />
                <p className="mt-1 text-xs text-muted">vs previous period</p>
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm text-muted">Average per transaction</p>
                <p className="nums mt-2 text-xl font-semibold text-ink">{vnd(averageTransaction)}</p>
                <div className="mt-2">
                  <ChangeSummary change={averageTxnChange} />
                </div>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.68fr_0.74fr]">
        <Card className="rise p-4 sm:p-5" style={rise(4)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Income vs expense trend</h2>
            <Badge tone="neutral">Monthly</Badge>
          </div>
          <div className="mt-4 h-64">
            {cash.isLoading ? (
              <Skeleton className="h-full" />
            ) : cashData.length === 0 ? (
              <EmptyPanel title="No monthly trend yet" body="Monthly lines appear when transactions exist." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#f0efec" vertical={false} />
                  <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: "#eaeaea" }} />
                  <YAxis tick={axisTick} tickFormatter={shortVnd} tickLine={false} axisLine={false} width={54} />
                  <Tooltip formatter={(value) => vnd(Number(value))} contentStyle={tooltipStyle} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#5fa56b" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#c56961" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#1a1a18" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="rise p-4 sm:p-5" style={rise(5)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Weekly spending pattern</h2>
            <Badge tone="neutral">Weekdays</Badge>
          </div>
          <div className="mt-4 h-64">
            {transactionsLoading ? (
              <Skeleton className="h-full" />
            ) : weeklyData.every((day) => day.expense === 0) ? (
              <EmptyPanel title="No weekday pattern yet" body="Expense bars appear after spending is recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#f0efec" vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: "#eaeaea" }} />
                  <YAxis tick={axisTick} tickFormatter={shortVnd} tickLine={false} axisLine={false} width={48} />
                  <Tooltip formatter={(value) => vnd(Number(value))} contentStyle={tooltipStyle} />
                  <Bar dataKey="expense" name="Expense" fill="#5fa56b" radius={[5, 5, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="rise p-4 sm:p-5" style={rise(6)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Top spending days</h2>
            <Badge tone="neutral">By amount</Badge>
          </div>
          {transactionsLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : topDays.length === 0 ? (
            <div className="mt-4 h-64">
              <EmptyPanel title="No spending days yet" body="Daily totals appear after expenses are recorded." />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {topDays.map((day) => (
                <div key={day.date} className="grid grid-cols-[64px_minmax(0,1fr)_92px] items-center gap-3">
                  <span className="nums text-xs text-muted">{day.label}</span>
                  <div className="h-2 rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(8, (day.total / maxTopDay) * 100)}%` }}
                    />
                  </div>
                  <span className="nums text-right text-xs font-medium text-charcoal">{compactMoney(day.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="rise overflow-hidden" style={rise(7)}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
            <h2 className="font-semibold text-ink">Recent activity</h2>
            <Link to="/transactions" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              View all
            </Link>
          </div>
          {transactionsLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-medium text-ink">No transactions yet</p>
              <p className="mt-1 text-sm text-muted">Your latest entries will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recentItems.map((txn) => (
                <li key={txn.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Badge tone={txn.type === "income" ? "green" : "red"}>{txn.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{catName(txn.category_id)}</p>
                    <p className="nums truncate text-xs text-muted">
                      {format(parseDate(txn.occurred_on), "dd MMM yyyy")}
                      {txn.note ? ` · ${txn.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "nums shrink-0 text-right text-sm font-semibold",
                      txn.type === "income" ? "text-brand-dark" : "text-ink",
                    )}
                  >
                    {txn.type === "income" ? "+" : "-"}
                    {vnd(txn.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rise p-4 sm:p-5" style={rise(8)}>
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={18} className="text-muted" strokeWidth={2} />
            <h2 className="font-semibold text-ink">Key insights</h2>
          </div>
          <div className="space-y-4">
            {insights.map((insight) => (
              <InsightRow key={insight.title} {...insight} />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
