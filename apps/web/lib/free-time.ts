// Deterministic free-time arithmetic (Phase 8) — no AI involved. Pure minute
// arithmetic operating on plain numbers; the only place local-time semantics
// enter is where a task's time is converted to "minutes since midnight",
// which callers do in the browser (matching how the rest of the calendar —
// WeekTimeGrid — already treats local wall-clock time as the source of truth). Never call this from a server
// route: the server's own timezone could disagree with the viewer's.
import { getTaskTimeBounds } from "@/lib/calendar"
import type { Task } from "@/lib/tasks"

export interface TimeRange {
  /** Minutes since local midnight, inclusive. */
  start: number
  /** Minutes since local midnight, exclusive. */
  end: number
}

const MINUTES_IN_DAY = 24 * 60

// Waking hours used when a caller doesn't have a more specific preference.
// There is no per-user "day starts/ends at" setting in Hengo today — this is
// a sensible, overridable default, not a hidden requirement.
export const DEFAULT_DAY_BOUNDS: TimeRange = { start: 7 * 60, end: 23 * 60 }

/** Sorts and collapses overlapping/adjacent ranges, clipped to a single day. */
export function mergeBusyRanges(ranges: TimeRange[]): TimeRange[] {
  const clipped = ranges
    .map((r) => ({
      start: Math.max(0, Math.min(r.start, MINUTES_IN_DAY)),
      end: Math.max(0, Math.min(r.end, MINUTES_IN_DAY)),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start)

  const merged: TimeRange[] = []
  for (const r of clipped) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else merged.push({ ...r })
  }
  return merged
}

/**
 * Free gaps within `dayBounds` after subtracting every busy range.
 * `maxTotalMinutes` (e.g. a goal's remaining weekly-capacity minutes, see
 * lib/weekly-capacity.ts) trims later windows once the running total is hit —
 * free-time.ts has no concept of "weekly capacity" itself, callers compose it.
 */
export function computeFreeWindows(
  busy: TimeRange[],
  dayBounds: TimeRange = DEFAULT_DAY_BOUNDS,
  options: { minWindowMinutes?: number; maxTotalMinutes?: number } = {},
): TimeRange[] {
  const minWindow = options.minWindowMinutes ?? 15
  const merged = mergeBusyRanges(busy)

  const windows: TimeRange[] = []
  let cursor = dayBounds.start
  for (const b of merged) {
    if (b.start > cursor) windows.push({ start: cursor, end: Math.min(b.start, dayBounds.end) })
    cursor = Math.max(cursor, b.end)
    if (cursor >= dayBounds.end) break
  }
  if (cursor < dayBounds.end) windows.push({ start: cursor, end: dayBounds.end })

  let result = windows.filter((w) => w.end - w.start >= minWindow)

  if (options.maxTotalMinutes != null) {
    let remaining = options.maxTotalMinutes
    const capped: TimeRange[] = []
    for (const w of result) {
      if (remaining <= 0) break
      const len = Math.min(w.end - w.start, remaining)
      if (len >= minWindow) capped.push({ start: w.start, end: w.start + len })
      remaining -= len
    }
    result = capped
  }

  return result
}

/** Busy minute-ranges for a day's non-all-day, incomplete Hengo tasks. */
export function taskBusyRanges(tasks: Task[]): TimeRange[] {
  return tasks
    .filter((t) => !t.completed)
    .map((t) => getTaskTimeBounds(t))
    .filter((b) => !b.isAllDay)
    .map((b) => ({ start: b.startMin, end: b.endMin }))
}

/** Free windows between one day's Hengo tasks. */
export function getAvailableFocusWindows(params: {
  tasks: Task[]
  dayBounds?: TimeRange
  minWindowMinutes?: number
  maxTotalMinutes?: number
}): TimeRange[] {
  return computeFreeWindows(taskBusyRanges(params.tasks), params.dayBounds ?? DEFAULT_DAY_BOUNDS, {
    minWindowMinutes: params.minWindowMinutes,
    maxTotalMinutes: params.maxTotalMinutes,
  })
}

export function formatMinutesHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** e.g. "18:30–19:30" */
export function formatFreeWindow(window: TimeRange): string {
  return `${formatMinutesHHMM(window.start)}–${formatMinutesHHMM(window.end)}`
}
