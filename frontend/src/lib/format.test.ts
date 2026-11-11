import { expect, test } from "vitest";

import { formatAmount, formatDate, formatMoney, formatSignedPercent, setFormatLocale, toWholeAmount } from "./format";

test("vi money, amounts and dates", () => {
  setFormatLocale("vi-VN");
  expect(formatMoney(1250000)).toBe(new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(1250000));
  expect(formatAmount("120000.00")).toBe("120.000");
  expect(formatDate("2026-11-04")).toBe("04/11/2026");
  expect(toWholeAmount("120000.00")).toBe("120000");
  expect(formatSignedPercent(0.125)).toBe("+12,5%");
});
