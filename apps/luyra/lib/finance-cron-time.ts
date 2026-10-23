// Date math for the cron routes, pinned to Asia/Seoul.
//
// lib/finance-month.ts uses the server's local timezone, which is fine in the
// browser (the user's own clock) but wrong in a scheduled function: Vercel
// runs those in UTC, so "today" and "this month" would shift nine hours away
// from the user's actual day. Every other KRW-denominated assumption in
// Finance is already Seoul-based (the USD→KRW rate, the quiet-hours default),
// so the cron side pins to the same zone rather than inventing a per-user
// timezone column that nothing would populate.

export const APP_TIME_ZONE = "Asia/Seoul";

/** YYYY-MM-DD for the given instant in Asia/Seoul. */
export function appDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** YYYY-MM for the given instant in Asia/Seoul. */
export function appMonth(now: Date = new Date()): string {
  return appDate(now).slice(0, 7);
}

/** Minutes since midnight in Asia/Seoul — used for the quiet-hours window. */
export function appMinutesOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [hour, minute] = parts.split(":").map(Number);
  return hour * 60 + minute;
}

/** The day after `date` (YYYY-MM-DD) — the exclusive end of a single-day range. */
export function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

/**
 * The Monday of the week containing `date`, as YYYY-MM-DD. Used as the key
 * for "which week has already been reported on".
 */
export function weekStart(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const point = new Date(Date.UTC(year, month - 1, day));
  // getUTCDay(): 0 = Sunday. Shift so Monday is the first day of the week.
  const offset = (point.getUTCDay() + 6) % 7;
  point.setUTCDate(point.getUTCDate() - offset);
  return point.toISOString().slice(0, 10);
}

/** First day of the month containing `date`, as YYYY-MM-DD. */
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** First day of the month AFTER `month` — the exclusive end of a month range. */
export function nextMonthStart(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const next = monthNumber === 12 ? 1 : monthNumber + 1;
  return `${nextYear}-${String(next).padStart(2, "0")}-01`;
}

/** The month before `month`, as YYYY-MM. */
export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const prevYear = monthNumber === 1 ? year - 1 : year;
  const prev = monthNumber === 1 ? 12 : monthNumber - 1;
  return `${prevYear}-${String(prev).padStart(2, "0")}`;
}

/** "March 2026" for a YYYY-MM key. */
export function monthKeyLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
