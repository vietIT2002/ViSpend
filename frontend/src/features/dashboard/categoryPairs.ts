import type { CategorySpend } from "../../types";

export interface CategoryPair {
  key: string;
  category: string;
  current: number;
  previous: number;
  percent: number;
}

/**
 * Pairs each current-window category with its total from the previous window
 * (matched by category id, 0 when absent). Previous-only categories are not
 * listed; rows are ordered by current total, top 8.
 */
export function pairCategoryTotals(current?: CategorySpend[], previous?: CategorySpend[]): CategoryPair[] {
  const prev = new Map((previous ?? []).map((r) => [r.category_id, Number(r.total)]));
  return (current ?? [])
    .map((r) => ({
      key: r.category_id,
      category: r.category,
      current: Number(r.total),
      previous: prev.get(r.category_id) ?? 0,
      percent: r.percent,
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 8);
}
