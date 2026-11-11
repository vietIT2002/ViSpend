import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, type Tone } from "../../components/ui/badge";
import { Card, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ErrorState } from "../../components/ui/states";
import { currentMonth, singleMonth } from "../../lib/dates";
import { formatMoney, formatMonth, formatNumber, formatTime } from "../../lib/format";
import { useCategoryLabel, useT } from "../../lib/i18n";
import { useCategories } from "../categories/hooks";
import { ALERT_LABEL, ALERT_ORDER, ALERT_TONE } from "./alerts";
import { useBudgetPlan } from "./hooks";

interface AttentionItem {
  key: string;
  text: string;
  badge: { tone: Tone; label: string };
  to: string;
  rank: number;
}

const MAX_ITEMS = 5;

/**
 * Dashboard "Needs attention": each row is a count or amount in words, a status
 * badge with text, and a link to the list that shows it. Zero rows is a result.
 */
export function NeedsAttention({
  from,
  to,
  net,
}: {
  from: string;
  to: string;
  /** Net balance of the period; null while unknown (loading or failed), which omits the overspent row. */
  net: number | null;
}) {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const { data: cats = [] } = useCategories();
  const month = singleMonth(from, to);
  const plan = useBudgetPlan(month ?? "");
  const budgetsHref = month && month !== currentMonth() ? `/budgets?month=${month}` : "/budgets";

  const labelFor = (categoryId: string, fallback: string) => {
    const cat = cats.find((c) => c.id === categoryId);
    return cat ? categoryLabel(cat) : fallback;
  };

  const items: AttentionItem[] = [];
  if (net !== null && net < 0) {
    items.push({
      key: "net",
      text: t("attention.overspent", { amount: formatMoney(Math.abs(net)) }),
      badge: { tone: "danger", label: t("attention.badgeOverspent") },
      to: `/transactions?type=expense&from=${from}&to=${to}`,
      rank: -1,
    });
  }
  for (const item of plan.data?.items ?? []) {
    if (item.alert === "safe") continue;
    const category = labelFor(item.category_id, item.category);
    const remaining = Number(item.remaining);
    items.push({
      key: item.id,
      text:
        remaining < 0
          ? t("attention.overLimit", { category, over: formatMoney(Math.abs(remaining)), limit: formatMoney(item.amount) })
          : t("attention.nearLimit", {
              category,
              percent: formatNumber(item.usage_percent),
              left: formatMoney(remaining),
            }),
      badge: { tone: ALERT_TONE[item.alert], label: t(ALERT_LABEL[item.alert]) },
      to: budgetsHref,
      rank: ALERT_ORDER[item.alert],
    });
  }
  items.sort((a, b) => a.rank - b.rank);
  const shown = items.slice(0, MAX_ITEMS);
  const hasBudget = Number(plan.data?.monthly_budget ?? 0) > 0;
  const loading = Boolean(month) && plan.isLoading;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={t("attention.title")}
        titleId="attention-title"
        action={
          <Link to={budgetsHref} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
            {t("pulse.openBudgets")}
          </Link>
        }
      />
      <p role="status" className="sr-only">
        {loading ? "" : t("attention.count", { count: formatNumber(items.length) })}
      </p>

      {plan.isError && !plan.data ? (
        <ErrorState message={t("attention.loadError")} onRetry={() => void plan.refetch()} retrying={plan.isFetching} />
      ) : loading ? (
        <div className="space-y-3 p-4" aria-busy="true">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      ) : (
        <div className="flex-1">
          {shown.length > 0 ? (
            <ul className="divide-y divide-line" aria-labelledby="attention-title">
              {shown.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-black/[0.02]"
                  >
                    <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
                    <span className="nums min-w-0 flex-1 text-ink">{item.text}</span>
                    <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {items.length > MAX_ITEMS && (
                <li className="px-4 py-2.5 text-sm">
                  <Link to={budgetsHref} className="font-medium text-brand underline-offset-4 hover:underline">
                    {t("attention.more", { count: formatNumber(items.length - MAX_ITEMS) })}
                  </Link>
                </li>
              )}
            </ul>
          ) : month && hasBudget && plan.data ? (
            <div className="px-4 py-6 text-center">
              <p className="font-medium text-pastel-green-ink">{t("attention.none")}</p>
              <p className="mt-1 text-sm text-muted">{t("attention.checkedAt", { time: formatTime(Date.now()) })}</p>
            </div>
          ) : null}

          <div className="border-t border-line px-4 py-3 text-sm text-muted">
            {!month ? (
              t("pulse.fullMonthOnly")
            ) : hasBudget && plan.data ? (
              <span className="nums">
                {t("attention.budgetLine", {
                  month: formatMonth(month),
                  budget: formatMoney(plan.data.monthly_budget),
                  left: formatMoney(plan.data.total_remaining),
                })}
              </span>
            ) : (
              <>
                {t("pulse.noBudget", { month: formatMonth(month) })}{" "}
                <Link to={budgetsHref} className="font-medium text-brand underline-offset-4 hover:underline">
                  {t("pulse.setBudget")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
