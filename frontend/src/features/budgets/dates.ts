// Month/date helpers shared by the budgets page and its add/edit modal.
// A "month" here is the string "YYYY-MM"; ISO dates are "YYYY-MM-DD".

export type BudgetScope = "month" | "remaining" | "custom";

export function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthFirstIso(month: string) {
  return `${month}-01`;
}

export function monthLastIso(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function defaultBudgetScope(month: string): BudgetScope {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month === current && now.getDate() > 5 ? "remaining" : "month";
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
  const last = new Date(y, m, 0).getDate();
  return `${short} 1 – ${short} ${last}`;
}

// Days left in the displayed month, relative to today (only for the current month).
export function monthCountdown(month: string) {
  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month === current)
    return { state: "current" as const, daysLeft: totalDays - now.getDate() + 1, totalDays };
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
