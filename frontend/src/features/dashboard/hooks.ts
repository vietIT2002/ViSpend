import { useQuery } from "@tanstack/react-query";

import { api, buildQuery } from "../../lib/api";
import type { CategorySpend, DashboardSummary, TrendPoint } from "../../types";

const iso = (d: Date) => d.toISOString().slice(0, 10);

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

export function useCashflow(months = 6) {
  const now = new Date();
  const from = iso(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1));
  const to = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return useQuery({
    queryKey: ["dashboard", "trend", from, to],
    queryFn: () =>
      api.get<TrendPoint[]>(buildQuery("/dashboard/trend", { granularity: "month", from, to })),
  });
}

/** Equal-length period immediately before [from, to], for change comparisons. */
export function previousPeriod(from?: string, to?: string) {
  if (!from || !to) return { from: undefined, to: undefined };
  const f = new Date(from);
  const t = new Date(to);
  const len = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
  const pt = new Date(f);
  pt.setDate(pt.getDate() - 1);
  const pf = new Date(pt);
  pf.setDate(pf.getDate() - (len - 1));
  return { from: iso(pf), to: iso(pt) };
}
