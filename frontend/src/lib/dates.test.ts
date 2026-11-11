import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { lastOfMonth, previousPeriod, rangeFor, singleMonth, todayIso, weekdayIndex } from "./dates";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("this month at 00:30 local on 1 Nov", () => {
  vi.setSystemTime(new Date("2026-10-31T17:30:00Z")); // 00:30 on 1 Nov in UTC+7
  expect(todayIso()).toBe("2026-11-01");
  expect(rangeFor("this_month")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
});

test("month presets compare with whole previous months", () => {
  expect(previousPeriod("2026-11-01", "2026-11-30")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  expect(previousPeriod("2026-09-01", "2026-11-30")).toEqual({ from: "2026-06-01", to: "2026-08-31" });
});

test("custom ranges compare with the same number of days before", () => {
  expect(previousPeriod("2026-11-05", "2026-11-11")).toEqual({ from: "2026-10-29", to: "2026-11-04" });
});

test("weekday and month math", () => {
  expect(weekdayIndex("2026-11-09")).toBe(0); // Monday
  expect(lastOfMonth("2028-02")).toBe("2028-02-29");
  expect(singleMonth("2026-11-01", "2026-11-30")).toBe("2026-11");
  expect(singleMonth("2026-11-02", "2026-11-30")).toBeNull();
});
