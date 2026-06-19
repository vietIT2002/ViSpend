import { WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { useCategoryLabel, useLocale, useT } from "../../lib/i18n";
import { vnd } from "../../lib/utils";
import type { BudgetAlert } from "../../types";
import { useCategories } from "../categories/hooks";
import { useBudgetPlan } from "./hooks";

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

// Returns "YYYY-MM" when [from, to] is exactly one full calendar month, else null.
function fullCalendarMonth(from?: string, to?: string): string | null {
  if (!from || !to) return null;
  const [y, m, d] = from.split("-");
  if (d !== "01") return null;
  const last = new Date(Number(y), Number(m), 0).getDate();
  if (to !== `${y}-${m}-${String(last).padStart(2, "0")}`) return null;
  return `${y}-${m}`;
}

export function BudgetPulse({ from, to }: { from?: string; to?: string }) {
  const t = useT();
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  const { data: cats = [] } = useCategories();
  const month = fullCalendarMonth(from, to);
  const { data: plan } = useBudgetPlan(month ?? "");

  const labelFor = (categoryId: string, fallback: string) => {
    const cat = cats.find((c) => c.id === categoryId);
    return cat ? categoryLabel(cat) : fallback;
  };

  const monthName = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    return new Date(y, mm - 1, 1).toLocaleString(locale, { month: "long" });
  };

  if (!month) {
    return (
      <Card className="rise flex items-center gap-3 p-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
          <WalletCards size={18} />
        </span>
        <p className="text-sm text-muted">{t("pulse.fullMonthOnly")}</p>
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
          <h2 className="font-medium text-ink">{t("pulse.monthlyBudget")}</h2>
        </div>
        <Link to="/budgets" className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline">
          {t("pulse.openBudgets")}
        </Link>
      </div>

      {hasBudget ? (
        <>
          <p className="mt-4 text-lg leading-relaxed text-ink">
            {t("pulse.sentence", {
              month: monthName(month),
              budget: vnd(plan!.monthly_budget),
              remaining: vnd(plan!.total_remaining),
            })}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(plan!.items.length === 1 ? "pulse.acrossOne" : "pulse.acrossOther", {
              count: plan!.items.length,
              spent: vnd(plan!.total_spent),
            })}
          </p>
          {risks.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {risks.map((r) => {
                const remaining = Number(r.remaining);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="nums min-w-0 truncate text-sm text-charcoal">
                      <span className="font-medium text-ink">{labelFor(r.category_id, r.category)}</span>{" "}
                      {remaining < 0
                        ? t("pulse.overLimit", { over: vnd(Math.abs(remaining)), limit: vnd(r.amount) })
                        : t("pulse.underLimit", { remaining: vnd(r.remaining), limit: vnd(r.amount) })}
                    </p>
                    <Badge tone={ALERT_TONE[r.alert]}>{t(ALERT_LABEL[r.alert])}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {t("pulse.noBudget", { month: monthName(month) })}{" "}
          <Link to="/budgets" className="font-medium text-brand-dark hover:underline">
            {t("pulse.setBudget")}
          </Link>
        </p>
      )}
    </Card>
  );
}
