import { expect, test } from "vitest";

import { parseMoneyDigits } from "./money-input";

test.each([
  ["120.000", "120000"],
  ["1.250.000", "1250000"],
  ["120000.00", "120000"],
  ["1.250.000,00", "1250000"],
  ["1,250,000", "1250000"],
  ["12,5", "12"],
  ["", ""],
  ["abc", ""],
  ["000123", "123"],
])("parseMoneyDigits(%j) = %j", (input, out) => {
  expect(parseMoneyDigits(input)).toBe(out);
});
