import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { vnd } from "../../lib/utils";
import { cn } from "../../lib/utils";
import type { BudgetAlert, BudgetAllocationStatus } from "../../types";
import { useCategories } from "../categories/hooks";
import {
  useBudgetPlan,
  useCopyBudgetPlan,
  useDeleteBudgetAllocation,
  useUpsertBudgetAllocation,
  useUpsertBudgetMonth,
} from "./hooks";

const ALERT_TONE: Record<BudgetAlert, "green" | "yellow" | "red"> = {
  safe: "green",
  watch: "yellow",
  tight: "red",
  over: "red",
};
const ALERT_LABEL: Record<BudgetAlert, string> = {
  safe: "Safe",
  watch: "Watch",
  tight: "Tight",
  over: "Over",
};

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function AllocationRow({ item, month }: { item: BudgetAllocationStatus; month: string }) {
  const upsert = useUpsertBudgetAllocation();
  const del = useDeleteBudgetAllocation();
  const [amount, setAmount] = useState(item.amount);
  useEffect(() => setAmount(item.amount), [item.amount]);

  function save() {
    const next = amount.trim();
    if (!next || Number(next) <= 0 || Number(next) === Number(item.amount)) {
      setAmount(item.amount);
      return;
    }
    upsert.mutate({ month, category_id: item.category_id, amount: next });
  }

  const remaining = Number(item.remaining);
  return (
    <div className="grid grid-cols-2 items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 sm:grid-cols-[minmax(120px,1fr)_116px_96px_96px_56px_92px] sm:px-5">
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
        <span className="h-9 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#cbd5d1" }} />
        <p className="truncate font-medium text-ink">{item.category}</p>
      </div>
      <div>
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:hidden">
          Allocation
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
          Spent
        </span>
        <span className="nums text-sm font-medium text-ink">{vnd(item.spent)}</span>
      </div>
      <div className="text-right sm:text-left">
        <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-muted sm:hidden">
          Left
        </span>
        <span className={cn("nums text-sm font-medium", remaining < 0 ? "text-expense" : "text-ink")}>
          {vnd(item.remaining)}
        </span>
      </div>
      <span className="nums hidden text-sm text-muted sm:inline">{item.usage_percent}%</span>
      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
        <Badge tone={ALERT_TONE[item.alert]}>{ALERT_LABEL[item.alert]}</Badge>
        <Button
          variant="danger"
          className="size-8 px-0"
          aria-label="Remove allocation"
          disabled={del.isPending}
          onClick={() => del.mutate(item.id)}
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

function AddAllocation({ month, options }: { month: string; options: { id: string; name: string }[] }) {
  const upsert = useUpsertBudgetAllocation();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  function add() {
    if (!categoryId || !amount || Number(amount) <= 0) return;
    upsert.mutate(
      { month, category_id: categoryId, amount },
      {
        onSuccess: () => {
          setCategoryId("");
          setAmount("");
        },
      },
    );
  }

  return (
    <div className="grid gap-2 border-t border-line bg-canvas px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:px-5">
      <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
        <option value="">Choose expense category…</option>
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
        placeholder="Allocation amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button onClick={add} disabled={!categoryId || !amount || upsert.isPending}>
        <Plus size={16} /> Add
      </Button>
    </div>
  );
}

export function BudgetsPage() {
  const [month, setMonth] = useState(thisMonth());
  const { data: plan, isLoading } = useBudgetPlan(month);
  const { data: cats = [] } = useCategories();
  const upsertMonth = useUpsertBudgetMonth();
  const copyPlan = useCopyBudgetPlan();

  const [budgetDraft, setBudgetDraft] = useState("");
  useEffect(() => {
    if (!plan) return;
    setBudgetDraft(Number(plan.monthly_budget) > 0 ? String(Number(plan.monthly_budget)) : "");
  }, [plan?.monthly_budget, month]);

  const available = Number(plan?.available_money ?? 0);
  const monthlyBudget = Number(plan?.monthly_budget ?? 0);
  const hasBudget = monthlyBudget > 0;
  const draftNum = Number(budgetDraft || 0);
  const exceedsAvailable = draftNum > available;
  const allocatedIds = useMemo(() => new Set((plan?.items ?? []).map((i) => i.category_id)), [plan]);
  const expenseOptions = useMemo(
    () => cats.filter((c) => c.type === "expense" && !allocatedIds.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
    [cats, allocatedIds],
  );
  const risks = (plan?.items ?? []).filter((i) => i.alert !== "safe").slice(0, 3);

  function saveBudget() {
    if (!budgetDraft || draftNum <= 0 || exceedsAvailable) return;
    upsertMonth.mutate({ month, amount: budgetDraft });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Budgets</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">Set the month&apos;s spending room, then assign it.</h1>
          <p className="text-sm text-muted">
            Enter one monthly budget, then split it across categories. Spending is pulled from your transactions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="size-10 px-0" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="nums inline-flex h-10 items-center rounded-md border border-line bg-surface px-3 text-sm font-medium">
            {monthLabel(month)}
          </span>
          <Button variant="secondary" className="size-10 px-0" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="secondary"
            disabled={copyPlan.isPending}
            onClick={() => copyPlan.mutate({ from_month: shiftMonth(month, -1), to_month: month })}
          >
            <Copy size={15} /> Copy last month
          </Button>
        </div>
      </header>

      <section className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Setup rail */}
        <div className="grid gap-4">
          <Card className="rise space-y-3 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Monthly budget</p>
            <Input
              type="number"
              inputMode="numeric"
              className="nums h-14 text-2xl font-semibold"
              placeholder="0"
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value)}
            />
            <p className="text-xs text-muted">
              Available money: <span className="nums">{vnd(available)}</span>
            </p>
            {exceedsAvailable && <p className="text-xs text-expense">Budget cannot exceed your available money.</p>}
            <div className="flex gap-2">
              <Button onClick={saveBudget} disabled={!budgetDraft || draftNum <= 0 || exceedsAvailable || upsertMonth.isPending}>
                Save budget
              </Button>
            </div>
          </Card>

          <Card className="rise space-y-3 p-5" style={{ "--i": 1 } as React.CSSProperties}>
            <h2 className="font-medium text-ink">Month math</h2>
            <dl className="space-y-2 border-t border-line pt-3">
              {[
                ["Budget", vnd(plan?.monthly_budget ?? 0)],
                ["Spent", vnd(plan?.total_spent ?? 0)],
                ["Left", vnd(plan?.total_remaining ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="nums text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="rise space-y-2 p-5" style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="font-medium text-ink">Allocation pool</h2>
            <div className="rounded-lg bg-canvas p-3">
              <p className="text-xs text-muted">Still unassigned</p>
              <p className="nums mt-1 text-xl font-semibold text-ink">{vnd(plan?.unallocated_amount ?? 0)}</p>
              <p className="mt-1 text-xs text-muted">
                {vnd(plan?.allocated_total ?? 0)} of {vnd(plan?.monthly_budget ?? 0)} allocated.
              </p>
            </div>
          </Card>
        </div>

        {/* Allocation board */}
        <Card className="rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
            <div>
              <h2 className="font-medium text-ink">Allocation board</h2>
              <p className="text-xs text-muted">Edit allocations here. The rest updates from transaction data.</p>
            </div>
            {hasBudget && (
              <Badge tone={Number(plan?.unallocated_amount) < 0 ? "red" : "blue"}>
                {vnd(plan?.allocated_total ?? 0)} / {vnd(plan?.monthly_budget ?? 0)}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <p className="px-5 py-10 text-center text-sm text-muted">Loading…</p>
          ) : !hasBudget ? (
            <div className="px-6 py-14 text-center">
              <p className="font-medium text-ink">Set a monthly budget first</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Category allocation unlocks after you save the month&apos;s total budget.
              </p>
            </div>
          ) : (
            <>
              {(plan?.items ?? []).map((item) => (
                <AllocationRow key={item.id} item={item} month={month} />
              ))}
              {(plan?.items ?? []).length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-muted">
                  No allocations yet. Add an expense category below.
                </p>
              )}
              {expenseOptions.length > 0 && <AddAllocation month={month} options={expenseOptions} />}
            </>
          )}
        </Card>

        {/* Preview rail */}
        <Card className="rise space-y-4 p-5 xl:sticky xl:top-24" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-ink">Dashboard preview</h2>
            <Badge tone="blue">Preview</Badge>
          </div>
          {hasBudget ? (
            <p className="text-lg leading-relaxed text-ink">
              <span className="font-semibold text-brand-dark">{monthName(month)} budget</span> is{" "}
              <span className="nums">{vnd(plan?.monthly_budget ?? 0)}</span>. You have{" "}
              <span className="nums">{vnd(plan?.total_remaining ?? 0)}</span> left this month.
            </p>
          ) : (
            <p className="text-sm text-muted">Save a monthly budget to see the dashboard summary.</p>
          )}
          {risks.length > 0 && (
            <ul className="divide-y divide-line">
              {risks.map((r) => {
                const remaining = Number(r.remaining);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.category}</p>
                      <p className="nums text-xs text-muted">
                        {remaining < 0
                          ? `${vnd(Math.abs(remaining))} over limit`
                          : `${vnd(r.remaining)} left`}
                      </p>
                    </div>
                    <Badge tone={ALERT_TONE[r.alert]}>{ALERT_LABEL[r.alert]}</Badge>
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
