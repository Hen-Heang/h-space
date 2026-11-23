import type { HabitCheckIn } from "./types"

// Pure logic for the Habits module — no React, no Supabase. Unlike Recovery
// (which tracks moment-level events with a KST hour boundary), a check-in is
// already a plain YYYY-MM-DD local date, one row per day, so day-diffing is
// plain calendar-date arithmetic.
const DAY_MS = 24 * 60 * 60 * 1000

/** Local YYYY-MM-DD for `d` — the format of HabitCheckIn.date. */
function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** True when `date` (YYYY-MM-DD) has a completed check-in. */
export function isDoneOn(checkins: HabitCheckIn[], date: string): boolean {
  return checkins.some((c) => c.date === date && c.completed)
}

/**
 * `checkins` with `date` set to done or not done — the optimistic cache value
 * for a toggle. Mirrors the API: checking in upserts one completed row per
 * (habit, date); un-checking deletes that date's row.
 */
export function withCheckin(
  checkins: HabitCheckIn[],
  habitId: string,
  date: string,
  done: boolean,
  now: Date = new Date(),
): HabitCheckIn[] {
  const rest = checkins.filter((c) => c.date !== date)
  if (!done) return rest
  const optimistic: HabitCheckIn = {
    id: `optimistic-${habitId}-${date}`,
    habitId,
    date,
    completed: true,
    createdAt: now.toISOString(),
  }
  return [optimistic, ...rest]
}

/** The last `count` local dates ending today, oldest first. */
export function lastNDates(count: number, now: Date = new Date()): string[] {
  const dates: string[] = []
  for (let offset = count - 1; offset >= 0; offset--) {
    const day = new Date(now)
    day.setDate(day.getDate() - offset)
    dates.push(toLocalDateString(day))
  }
  return dates
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS)
}

function completedDateSet(checkins: HabitCheckIn[]): Set<string> {
  return new Set(checkins.filter((c) => c.completed).map((c) => c.date))
}

/**
 * Consecutive completed days ending today or yesterday. Missing today doesn't
 * break the streak (you may not have checked in yet); missing yesterday does.
 * Never resets to punish a single missed day beyond breaking the *current*
 * run — longestStreak/consistencyPercent/daysActive are unaffected.
 */
export function currentStreak(checkins: HabitCheckIn[], now: Date = new Date()): number {
  const dates = completedDateSet(checkins)
  const today = toLocalDateString(now)
  let cursor = new Date(now)
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (dates.has(toLocalDateString(cursor))) {
    streak += 1
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Longest run of consecutive completed days across all history — never decreases. */
export function longestStreak(checkins: HabitCheckIn[]): number {
  const dates = [...completedDateSet(checkins)].sort()
  if (dates.length === 0) return 0

  let longest = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      run += 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
  }
  return longest
}

/** Completed days / days elapsed since `sinceDate` (inclusive), as 0–100. */
export function consistencyPercent(
  checkins: HabitCheckIn[],
  sinceDate: string,
  now: Date = new Date(),
): number {
  const elapsedDays = daysBetween(sinceDate, toLocalDateString(now)) + 1
  if (elapsedDays <= 0) return 0
  const completed = completedDateSet(checkins).size
  return Math.max(0, Math.min(100, Math.round((completed / elapsedDays) * 100)))
}

/** Calendar days since the habit was started — feeds lib/milestones.ts. */
export function daysActive(startedAt: string, now: Date = new Date()): number {
  return Math.max(0, daysBetween(startedAt.slice(0, 10), toLocalDateString(now)))
}
