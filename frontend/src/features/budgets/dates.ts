// Month/date helpers shared by the budgets page and its add/edit modal.
// A "month" here is the string "YYYY-MM"; ISO dates are "YYYY-MM-DD".

import {
  addDays,
  currentMonth,
  daysInMonth,
  firstOfMonth,
  lastOfMonth,
  shiftMonth as shiftMonthBase,
  todayIso as todayIsoBase,
} from "../../lib/dates";

export type BudgetScope = "month" | "remaining" | "custom";

export const thisMonth = currentMonth;
export const shiftMonth = shiftMonthBase;
export const monthFirstIso = firstOfMonth;
export const monthLastIso = lastOfMonth;
export const todayIso = todayIsoBase;

export function tomorrowIso() {
  return addDays(todayIsoBase(), 1);
}

export function defaultBudgetScope(month: string): BudgetScope {
  return month === currentMonth() && Number(todayIsoBase().slice(8)) > 5 ? "remaining" : "month";
}

export function defaultCustomStart(month: string) {
  const tomorrow = tomorrowIso();
  if (tomorrow.startsWith(`${month}-`)) return tomorrow;
  const today = todayIso();
  if (today.startsWith(`${month}-`)) return today;
  return monthFirstIso(month);
}

export function isDateInMonth(value: string, month: string) {
  return value >= monthFirstIso(month) && value <= monthLastIso(month);
}

export function effectiveFromForScope(month: string, scope: BudgetScope, customDate: string) {
  if (scope === "month") return monthFirstIso(month);
  if (scope === "custom") return customDate;
  const today = todayIso();
  return today.startsWith(`${month}-`) ? today : monthFirstIso(month);
}

export function monthRange(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  const short = new Date(y, m - 1, 1).toLocaleString(locale, { month: "short" });
  const last = daysInMonth(month);
  return `${short} 1 – ${short} ${last}`;
}

// Days left in the displayed month, relative to today (only for the current month).
export function monthCountdown(month: string) {
  const totalDays = daysInMonth(month);
  const current = currentMonth();
  if (month === current)
    return { state: "current" as const, daysLeft: totalDays - Number(todayIsoBase().slice(8)) + 1, totalDays };
  if (month < current) return { state: "past" as const, daysLeft: 0, totalDays };
  return { state: "future" as const, daysLeft: totalDays, totalDays };
}

export function monthName(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: "long" });
}

export function monthLabel(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(locale, { month: "long", year: "numeric" });
}

export function dateLabel(value: string, locale: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
