import type { HabitCheckIn } from "@/types/habit";

// Pure logic for the Habits module — no React, no DB. Ported from Hengo's
// lib/habits.ts: a check-in is a plain YYYY-MM-DD local date, one row per
// day, so day-diffing is plain calendar-date arithmetic.
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local YYYY-MM-DD for `date` (defaults to today) — matches HabitCheckIn.date. */
export function toCheckinDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS);
}

function completedDateSet(checkins: HabitCheckIn[]): Set<string> {
  return new Set(checkins.filter((c) => c.completed).map((c) => c.date));
}

/**
 * Consecutive completed days ending today or yesterday. Missing today doesn't
 * break the streak (you may not have checked in yet); missing yesterday does.
 */
export function currentStreak(checkins: HabitCheckIn[], now: Date = new Date()): number {
  const dates = completedDateSet(checkins);
  const today = toCheckinDate(now);
  let cursor = new Date(now);
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (dates.has(toCheckinDate(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive completed days across all history — never decreases. */
export function longestStreak(checkins: HabitCheckIn[]): number {
  const dates = [...completedDateSet(checkins)].sort();
  if (dates.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

/** Completed days / days elapsed since `sinceDate` (inclusive), as 0-100. */
export function consistencyPercent(checkins: HabitCheckIn[], sinceDate: string, now: Date = new Date()): number {
  const elapsedDays = daysBetween(sinceDate, toCheckinDate(now)) + 1;
  if (elapsedDays <= 0) return 0;
  const completed = completedDateSet(checkins).size;
  return Math.max(0, Math.min(100, Math.round((completed / elapsedDays) * 100)));
}

/** Calendar days since the habit was started — feeds lib/milestones.ts. */
export function daysActive(startedAt: string, now: Date = new Date()): number {
  return Math.max(0, daysBetween(startedAt.slice(0, 10), toCheckinDate(now)));
}
