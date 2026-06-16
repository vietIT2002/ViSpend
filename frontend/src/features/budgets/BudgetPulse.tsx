import { WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { vnd } from "../../lib/utils";
import type { BudgetAlert } from "../../types";
import { useBudgetPlan } from "./hooks";

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

// Returns "YYYY-MM" when [from, to] is exactly one full calendar month, else null.
function fullCalendarMonth(from?: string, to?: string): string | null {
  if (!from || !to) return null;
  const [y, m, d] = from.split("-");
  if (d !== "01") return null;
  const last = new Date(Number(y), Number(m), 0).getDate();
  if (to !== `${y}-${m}-${String(last).padStart(2, "0")}`) return null;
  return `${y}-${m}`;
}

function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

export function BudgetPulse({ from, to }: { from?: string; to?: string }) {
  const month = fullCalendarMonth(from, to);
  const { data: plan } = useBudgetPlan(month ?? "");

  if (!month) {
    return (
      <Card className="rise flex items-center gap-3 p-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
          <WalletCards size={18} />
        </span>
        <p className="text-sm text-muted">Budget tracking appears for full-month views.</p>
      </Card>
    );
  }

  const hasBudget = plan && Number(plan.monthly_budget) > 0;
  const risks = (plan?.items ?? []).filter((i) => i.alert !== "safe").slice(0, 2);

  return (
    <Card className="rise p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
            <WalletCards size={18} />
          </span>
          <h2 className="font-medium text-ink">Monthly budget</h2>
        </div>
        <Link to="/budgets" className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline">
          Open budgets
        </Link>
      </div>

      {hasBudget ? (
        <>
          <p className="mt-4 text-lg leading-relaxed text-ink">
            <span className="font-semibold text-brand-dark">{monthName(month)} budget</span> is{" "}
            <span className="nums">{vnd(plan!.monthly_budget)}</span>. You have{" "}
            <span className="nums">{vnd(plan!.total_remaining)}</span> left this month.
          </p>
          <p className="mt-1 text-sm text-muted">
            <span className="nums">{vnd(plan!.allocated_total)}</span> allocated ·{" "}
            <span className="nums">{vnd(plan!.unallocated_amount)}</span> unassigned
          </p>
          {risks.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {risks.map((r) => {
                const remaining = Number(r.remaining);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="nums min-w-0 truncate text-sm text-charcoal">
                      <span className="font-medium text-ink">{r.category}</span>{" "}
                      {remaining < 0
                        ? `is ${vnd(Math.abs(remaining))} over its ${vnd(r.amount)} limit`
                        : `has ${vnd(r.remaining)} left from ${vnd(r.amount)}`}
                    </p>
                    <Badge tone={ALERT_TONE[r.alert]}>{ALERT_LABEL[r.alert]}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No budget set for {monthName(month)}.{" "}
          <Link to="/budgets" className="font-medium text-brand-dark hover:underline">
            Set a budget
          </Link>
          .
        </p>
      )}
    </Card>
  );
}
