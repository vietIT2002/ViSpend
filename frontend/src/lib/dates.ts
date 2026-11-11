// Calendar-day helpers. Dates are "YYYY-MM-DD" strings in the user's own day;
// months are "YYYY-MM". Never use Date#toISOString() for a local day: in
// UTC+7 local midnight is the previous day in UTC.

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date's local calendar day. */
export function localIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso() {
  return localIso(new Date());
}

export function currentMonth() {
  return todayIso().slice(0, 7);
}

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d: d ?? 1 };
}

function fromUtc(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(iso: string, days: number) {
  const { y, m, d } = parts(iso);
  return fromUtc(Date.UTC(y, m - 1, d + days));
}

/** Inclusive number of days from `from` to `to`. */
export function daysInRange(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000) + 1;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: string) {
  const { y, m, d } = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function shiftMonth(month: string, delta: number) {
  const { y, m } = parts(month);
  return fromUtc(Date.UTC(y, m - 1 + delta, 1)).slice(0, 7);
}

export function firstOfMonth(month: string) {
  return `${month}-01`;
}

export function lastOfMonth(month: string) {
  const { y, m } = parts(month);
  return fromUtc(Date.UTC(y, m, 0));
}

export function daysInMonth(month: string) {
  return Number(lastOfMonth(month).slice(8));
}

/** "YYYY-MM" when [from, to] is exactly one calendar month, else null. */
export function singleMonth(from?: string, to?: string): string | null {
  if (!from || !to) return null;
  const month = from.slice(0, 7);
  return from === firstOfMonth(month) && to === lastOfMonth(month) ? month : null;
}

/** Number of whole calendar months when [from, to] spans full months, else null. */
export function wholeMonths(from: string, to: string): number | null {
  if (from !== firstOfMonth(from.slice(0, 7)) || to !== lastOfMonth(to.slice(0, 7))) return null;
  const a = parts(from);
  const b = parts(to);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}

/**
 * The period to compare with: the same number of whole months before a
 * month-aligned range (November → October), else the same number of days
 * immediately before.
 */
export function previousPeriod(from: string, to: string) {
  const months = wholeMonths(from, to);
  if (months) {
    const start = shiftMonth(from.slice(0, 7), -months);
    return { from: firstOfMonth(start), to: lastOfMonth(shiftMonth(start, months - 1)) };
  }
  const len = daysInRange(from, to);
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

export type PeriodKey = "this_month" | "last_month" | "3m" | "6m" | "custom";

export function rangeFor(key: PeriodKey, customFrom = "", customTo = "") {
  const month = currentMonth();
  switch (key) {
    case "this_month":
      return { from: firstOfMonth(month), to: lastOfMonth(month) };
    case "last_month": {
      const last = shiftMonth(month, -1);
      return { from: firstOfMonth(last), to: lastOfMonth(last) };
    }
    case "3m":
      return { from: firstOfMonth(shiftMonth(month, -2)), to: lastOfMonth(month) };
    case "6m":
      return { from: firstOfMonth(shiftMonth(month, -5)), to: lastOfMonth(month) };
    case "custom":
      return { from: customFrom, to: customTo };
  }
}

export const isIsoDate = (v: string | null | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
export const isIsoMonth = (v: string | null | undefined): v is string => Boolean(v && /^\d{4}-\d{2}$/.test(v));
