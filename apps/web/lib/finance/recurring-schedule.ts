import type { RecurringFrequency } from "@/types/finance";

// Date math for recurring rules, on plain YYYY-MM-DD strings in UTC so the
// result never depends on the server's timezone. "Today" itself comes from
// appDate() (Asia/Seoul) at the call site.

/** Most occurrences one rule may create in a single run; the rest follow on the next run. */
export const MAX_OCCURRENCES_PER_RUN = 62;

function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function format(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The occurrence after `date`. Monthly and yearly rules land on `anchorDay`,
 * clamped to the month's length — and because the anchor is kept separately,
 * a rule for the 31st returns to the 31st after a short month instead of
 * drifting to the 28th for good.
 */
export function nextOccurrence(date: string, frequency: RecurringFrequency, anchorDay: number): string {
  const { year, month, day } = parts(date);
  switch (frequency) {
    case "daily":
      return format(year, month, day + 1);
    case "weekly":
      return format(year, month, day + 7);
    case "monthly": {
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      return format(nextYear, nextMonth, Math.min(anchorDay, daysInMonth(nextYear, nextMonth)));
    }
    case "yearly":
      return format(year + 1, month, Math.min(anchorDay, daysInMonth(year + 1, month)));
  }
}

/**
 * Every occurrence from `nextDate` up to and including `today`, plus the
 * rule's new next date. Missed days are caught up in one run (up to the cap),
 * rather than one occurrence per run.
 */
export function dueOccurrences(
  nextDate: string,
  frequency: RecurringFrequency,
  anchorDay: number,
  today: string,
  limit: number = MAX_OCCURRENCES_PER_RUN
): { dates: string[]; nextDate: string } {
  const dates: string[] = [];
  let cursor = nextDate;
  while (cursor <= today && dates.length < limit) {
    dates.push(cursor);
    cursor = nextOccurrence(cursor, frequency, anchorDay);
  }
  return { dates, nextDate: cursor };
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
