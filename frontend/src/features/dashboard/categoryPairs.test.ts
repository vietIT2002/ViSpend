import { expect, test } from "vitest";

import type { CategorySpend } from "../../types";
import { pairCategoryTotals } from "./categoryPairs";

const row = (id: string, total: string, percent = 0): CategorySpend => ({
  category_id: id,
  category: id.toUpperCase(),
  color: null,
  total,
  percent,
  prev_total: "999",
});

test("previous total comes from the previous window by category id, 0 when absent", () => {
  const rows = pairCategoryTotals([row("a", "100"), row("b", "50")], [row("a", "70"), row("z", "5")]);
  expect(rows.map((r) => [r.key, r.current, r.previous])).toEqual([
    ["a", 100, 70],
    ["b", 50, 0],
  ]);
});

test("orders by current total desc and keeps the top 8", () => {
  const current = Array.from({ length: 10 }, (_, i) => row(`c${i}`, String(i * 10)));
  const rows = pairCategoryTotals(current, []);
  expect(rows).toHaveLength(8);
  expect(rows[0].key).toBe("c9");
  expect(rows[7].key).toBe("c2");
});

test("handles missing windows", () => {
  expect(pairCategoryTotals(undefined, undefined)).toEqual([]);
  expect(pairCategoryTotals([row("a", "10")], undefined)[0].previous).toBe(0);
});
