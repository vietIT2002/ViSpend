import { useQuery } from "@tanstack/react-query";

import { api, buildQuery } from "../../lib/api";
import { currentMonth, firstOfMonth, lastOfMonth, shiftMonth } from "../../lib/dates";
import type { CategorySpend, DashboardSummary, TrendPoint } from "../../types";

type TrendGranularity = "day" | "week" | "month";

export function useSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: ["dashboard", "summary", from, to],
    queryFn: () => api.get<DashboardSummary>(buildQuery("/dashboard/summary", { from, to })),
    enabled: Boolean(from && to),
  });
}

export function useCategorySpend(from?: string, to?: string) {
  return useQuery({
    queryKey: ["dashboard", "categories", from, to],
    queryFn: () => api.get<CategorySpend[]>(buildQuery("/dashboard/categories", { from, to })),
    enabled: Boolean(from && to),
  });
}

export function useTrend(granularity: TrendGranularity, from?: string, to?: string) {
  return useQuery({
    queryKey: ["dashboard", "trend", granularity, from, to],
    queryFn: () => api.get<TrendPoint[]>(buildQuery("/dashboard/trend", { granularity, from, to })),
    enabled: Boolean(from && to),
  });
}

/** Monthly income and expense for the last `months` calendar months, this one included. */
export function useCashflow(months = 6) {
  const month = currentMonth();
  return useTrend("month", firstOfMonth(shiftMonth(month, -(months - 1))), lastOfMonth(month));
}
