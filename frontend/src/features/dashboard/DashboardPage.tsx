import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { PeriodSelector } from "../../components/ui/period-selector";
import { Skeleton } from "../../components/ui/skeleton";
import { vnd } from "../../lib/utils";
import { useCategories } from "../categories/hooks";
import { useTransactions } from "../transactions/hooks";
import { previousPeriod, useCashflow, useCategorySpend, useSummary } from "./hooks";

const tooltipStyle = {
  border: "1px solid #eaeaea",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  boxShadow: "none",
  padding: "8px 10px",
} as const;

const axisTick = { fontSize: 11, fill: "#787774" } as const;

function shortVnd(value: number | string) {
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type DeltaDir = "good" | "bad" | "neutral";

function numberValue(value?: string) {
  return value ? Number(value) : 0;
}

function Delta({ current, prev, goodWhenUp }: { current: number; prev: number; goodWhenUp: boolean }) {
  if (prev <= 0) {
    return <span className="text-xs text-muted">vs last -</span>;
  }
  const pct = Math.round(((current - prev) / prev) * 100);
  const up = pct > 0;
  const dir: DeltaDir = pct === 0 ? "neutral" : up === goodWhenUp ? "good" : "bad";
  const cls = dir === "good" ? "text-brand-dark" : dir === "bad" ? "text-expense" : "text-muted";
  return (
    <span className={`nums text-xs ${cls}`}>
      {up ? "+" : ""}
      {pct}% vs last
    </span>
  );
}

function SummaryTile({
  label,
  value,
  prev,
  tone,
  goodWhenUp,
  loading,
}: {
  label: string;
  value: number;
  prev: number;
  tone: string;
  goodWhenUp: boolean;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-32" />
      ) : (
        <>
          <p className={`nums mt-2 text-2xl font-medium ${tone}`}>{vnd(value)}</p>
          <Delta current={value} prev={prev} goodWhenUp={goodWhenUp} />
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const prevRange = previousPeriod(range.from, range.to);

  const cur = useSummary(range.from, range.to);
  const prev = useSummary(prevRange.from, prevRange.to);
  const spend = useCategorySpend(range.from, range.to);
  const cash = useCashflow(6);
  const { data: recent } = useTransactions({});
  const { data: cats = [] } = useCategories();
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Unknown";

  const s = cur.data;
  const p = prev.data;
  const income = numberValue(s?.total_income);
  const expense = numberValue(s?.total_expense);
  const balance = numberValue(s?.balance);
  const prevIncome = numberValue(p?.total_income);
  const prevExpense = numberValue(p?.total_expense);
  const prevBalance = numberValue(p?.balance);
  const loadingSummary = cur.isLoading || prev.isLoading || !s;

  const cashData = (cash.data ?? []).map((t) => ({
    period: t.period.slice(2),
    income: Number(t.income),
    expense: Number(t.expense),
    net: Number(t.income) - Number(t.expense),
  }));
  const rows = spend.data ?? [];
  const recentItems = (recent?.items ?? []).slice(0, 6);
  const topCategory = rows[0];
  const categoryChart = rows.slice(0, 8).map((r) => ({
    category: r.category,
    current: Number(r.total),
    previous: Number(r.prev_total),
    percent: r.percent,
    color: r.color ?? "#3cb371",
  }));
  const averageCategorySpend =
    rows.length > 0 ? rows.reduce((sum, r) => sum + Number(r.total), 0) / rows.length : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Financial workspace</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">Know what changed before it becomes a habit.</h1>
          <p className="text-sm text-muted">Track VND cash flow, category spend, and recent activity in one view.</p>
        </div>
        <PeriodSelector onChange={setRange} />
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rise p-5 sm:p-6">
          {loadingSummary ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Net balance</p>
                  <p className={`nums mt-2 text-4xl font-medium sm:text-5xl ${balance < 0 ? "text-expense" : "text-ink"}`}>
                    {vnd(balance)}
                  </p>
                  <div className="mt-2">
                    <Delta current={balance} prev={prevBalance} goodWhenUp />
                  </div>
                </div>
                <Badge tone={balance < 0 ? "red" : "green"}>{balance < 0 ? "Watch spending" : "On track"}</Badge>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SummaryTile
                  label="Income"
                  value={income}
                  prev={prevIncome}
                  tone="text-brand-dark"
                  goodWhenUp
                  loading={false}
                />
                <SummaryTile
                  label="Expense"
                  value={expense}
                  prev={prevExpense}
                  tone="text-expense"
                  goodWhenUp={false}
                  loading={false}
                />
              </div>
            </>
          )}
        </Card>

        <Card className="rise p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink">Spending mix</h2>
            <Badge tone={rows.length ? "blue" : "neutral"}>{rows.length ? "Active" : "Empty"}</Badge>
          </div>
          {spend.isLoading ? (
            <Skeleton className="mt-5 h-64" />
          ) : rows.length === 0 ? (
            <div className="mt-5 rounded-lg border border-line bg-canvas px-5 py-10 text-center">
              <p className="font-medium text-ink">No spending yet</p>
              <p className="mt-1 text-sm text-muted">The pie chart appears after you add expenses.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr] lg:grid-cols-1 xl:grid-cols-[180px_1fr]">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChart}
                      dataKey="current"
                      nameKey="category"
                      innerRadius={44}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {categoryChart.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => vnd(String(value))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Top spend</p>
                  <p className="mt-2 truncate font-medium text-ink">{topCategory?.category ?? "No spending yet"}</p>
                  <p className="nums mt-1 text-sm text-muted">{topCategory ? vnd(topCategory.total) : "Add transactions to see it"}</p>
                </div>
                <div className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Average category</p>
                  <p className="nums mt-2 text-2xl font-medium text-ink">{vnd(averageCategorySpend)}</p>
                  <p className="text-sm text-muted">across {rows.length} spending categories</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rise p-5" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink">Category spend</h2>
            <span className="text-xs text-muted">Top {categoryChart.length || 0}</span>
          </div>
          {spend.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-line bg-canvas px-5 py-10 text-center">
              <p className="font-medium text-ink">No spending in this period</p>
              <p className="mt-1 text-sm text-muted">Add an expense to see the category chart here.</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 0 }}>
                  <CartesianGrid stroke="#f0efec" horizontal={false} />
                  <XAxis type="number" tick={axisTick} tickFormatter={shortVnd} tickLine={false} axisLine={{ stroke: "#eaeaea" }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={112}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(value) => vnd(String(value))} contentStyle={tooltipStyle} />
                  <Legend iconType="rect" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="previous" name="Previous" fill="#dcdbd6" radius={[0, 4, 4, 0]} barSize={9} />
                  <Bar dataKey="current" name="Current" radius={[0, 4, 4, 0]} barSize={9}>
                    {categoryChart.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rise p-5" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink">Cash flow trend</h2>
            <span className="text-xs text-muted">Last 6 months</span>
          </div>
          <div className="h-72">
            {cash.isLoading ? (
              <Skeleton className="h-full" />
            ) : cashData.length === 0 ? (
              <div className="grid h-full place-items-center rounded-lg border border-line bg-canvas px-5 text-center">
                <div>
                  <p className="font-medium text-ink">No activity yet</p>
                  <p className="mt-1 text-sm text-muted">Income and expense lines appear after you record transactions.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f0efec" vertical={false} />
                  <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: "#eaeaea" }} />
                  <YAxis tick={axisTick} tickFormatter={shortVnd} tickLine={false} axisLine={false} width={42} />
                  <Tooltip formatter={(value) => vnd(String(value))} contentStyle={tooltipStyle} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="income" name="Income" stroke="#3cb371" strokeWidth={2} dot={{ r: 2 }} />
                  <Line dataKey="expense" name="Expense" stroke="#9f2f2d" strokeWidth={2} dot={{ r: 2 }} />
                  <Line dataKey="net" name="Net" stroke="#1a1a18" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      <Card className="rise overflow-hidden" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-medium text-ink">Recent activity</h2>
          <Link to="/transactions" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            View all
          </Link>
        </div>
        {recentItems.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="font-medium text-ink">No transactions yet</p>
            <p className="mt-1 text-sm text-muted">Your latest entries will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recentItems.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <Badge tone={t.type === "income" ? "green" : "red"}>{t.type}</Badge>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{catName(t.category_id)}</span>
                <span className="nums hidden text-xs text-muted sm:inline">
                  {format(new Date(t.occurred_on), "dd MMM")}
                </span>
                <span className={`nums text-sm font-medium ${t.type === "income" ? "text-brand-dark" : "text-ink"}`}>
                  {t.type === "income" ? "+" : "-"}
                  {vnd(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
