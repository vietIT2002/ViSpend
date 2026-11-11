// Every number, amount and date on screen goes through these formatters, so a
// value reads the same in the table, the form, the tile and the toast.
// The locale follows the UI language (see LanguageProvider → setFormatLocale).

export type AppLocale = "en-GB" | "vi-VN";

let currentLocale: AppLocale = "vi-VN";

export function setFormatLocale(locale: AppLocale) {
  currentLocale = locale;
}

export function getFormatLocale(): AppLocale {
  return currentLocale;
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function nf(opts: Intl.NumberFormatOptions = {}, locale: string = currentLocale) {
  const key = `n|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    cache.set(key, f);
  }
  return f;
}

function df(opts: Intl.DateTimeFormatOptions, locale: string = currentLocale) {
  const key = `d|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    cache.set(key, f);
  }
  return f;
}

export const CURRENCY = "VND";
/** The one mark for a value that is not set. */
export const EMPTY = "—";

const DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const toNumber = (value: number | string) => (typeof value === "number" ? value : Number(value));

export function formatNumber(value: number | string, opts?: Intl.NumberFormatOptions) {
  return nf(opts).format(toNumber(value));
}

/** "1.250.000 ₫" (vi) · "₫1,250,000" (en). */
export function formatMoney(value: number | string, opts?: Intl.NumberFormatOptions) {
  return nf({ style: "currency", currency: CURRENCY, ...opts }).format(toNumber(value));
}

/** A money change with its sign: "+1.250.000 ₫", "-250.000 ₫", "0 ₫". */
export function formatSignedMoney(value: number | string) {
  return formatMoney(value, { signDisplay: "exceptZero" });
}

/** An amount in a column whose header names the currency: "1.250.000". */
export function formatAmount(value: number | string, opts?: Intl.NumberFormatOptions) {
  return nf({ maximumFractionDigits: 0, ...opts }).format(toNumber(value));
}

/** Takes a ratio: 0.125 → "12,5%". */
export function formatPercent(ratio: number, opts?: Intl.NumberFormatOptions) {
  return nf({ style: "percent", maximumFractionDigits: 1, ...opts }).format(ratio);
}

/** A change as a ratio with its sign: "+12,5%", "-3%", "0%". */
export function formatSignedPercent(ratio: number) {
  return formatPercent(ratio, { signDisplay: "exceptZero" });
}

/** Chart axes only: "1,2 Tr" (vi) · "1.2M" (en). */
export function formatCompact(value: number) {
  return nf({ notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Calendar days ("2026-11-04") are formatted in UTC so no time zone moves them. */
function toDate(iso: string) {
  return { date: new Date(DATE_ONLY.test(iso) ? `${iso}T00:00:00Z` : iso), utc: DATE_ONLY.test(iso) };
}

/** "04/11/2026". */
export function formatDate(iso: string) {
  const { date, utc } = toDate(iso);
  return df({ ...DATE, ...(utc ? { timeZone: "UTC" } : {}) }).format(date);
}

/** "04/11" — chart axes and tight lists. */
export function formatDayMonth(iso: string) {
  const { date, utc } = toDate(iso);
  return df({ day: "2-digit", month: "2-digit", ...(utc ? { timeZone: "UTC" } : {}) }).format(date);
}

/** "T4, 04/11/2026" (vi) · "Wed, 04/11/2026" (en). */
export function formatDateWithWeekday(iso: string) {
  const { date, utc } = toDate(iso);
  const weekday = df({ weekday: "short", ...(utc ? { timeZone: "UTC" } : {}) }).format(date);
  return `${weekday}, ${formatDate(iso)}`;
}

/** "04/11/2026 15:58" — date and time formatted apart (vi puts the time first otherwise). */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${df(DATE).format(d)} ${df(TIME).format(d)}`;
}

/** "15:58". */
export function formatTime(value: Date | number) {
  return df(TIME).format(value);
}

/** "01/11/2026 – 30/11/2026". */
export function formatDateRange(from: string, to: string) {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

/** "YYYY-MM" → "tháng 11 năm 2026" / "November 2026". */
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return df({ month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Capital first letter for a value shown on its own ("Tháng 11 năm 2026"). */
export function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase(currentLocale) + text.slice(1);
}

/** Integer VND from an API decimal string ("120000.00" → "120000"). */
export function toWholeAmount(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : "";
}
