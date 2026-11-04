// Second Brain, Phase 6: Daily/Weekly Review — pure aggregation only. No new
// tables, no new fetching: every input here is data the app already fetches
// elsewhere (useTodaysTasks' task groups, useTimeline's DailySummary via
// groupTimelineByDay, useHabits/useGoals lists, the reminders list). This
// file's job is just to decide what counts as "needs attention" and to
// package already-fetched data into display-ready summaries — the same
// normalizer-per-source shape lib/timeline.ts uses.
import { toLocalDateString } from "./date-utils"
import { computeListGoalHealth } from "./goal-health"
import type { DailySummary } from "./timeline"
import type { Goal, GoalHealthStatus } from "./goals"
import type { Reminder } from "./reminders"
import type { Habit, HabitCheckIn } from "./types"

// ── Shared predicates ───────────────────────────────────────────────────────

/** Most severe first — the order Morning Brief / Weekly Review list them in. */
const ATTENTION_SEVERITY: Partial<Record<GoalHealthStatus, number>> = {
  blocked: 0,
  at_risk: 1,
  attention: 2,
}

/** Active (non-completed/archived) goals whose health needs a look — used by
 * both Morning Brief ("what needs attention today") and Weekly Review
 * ("what to review this week").
 *
 * Health is computed **live** with `computeListGoalHealth`, the same engine
 * the Goals list and the Overview's Active goals card use — never read from
 * the stored `goals.health_status` column. Nothing in the app writes that
 * column (it keeps its `'not_started'` default), so filtering on it made
 * both reviews silently report "nothing needs attention" while the Goals
 * page showed goals at risk.
 *
 * Returns copies whose `health_status` / `health_reason` hold the live
 * result, so the review views and the AI-summary context show the same
 * label the Goals page does. The input goals are never mutated. Sorted
 * most-severe first; ties keep their input order. */
export function goalsNeedingAttention(goals: Goal[], now: Date = new Date()): Goal[] {
  const flagged: { goal: Goal; severity: number; index: number }[] = []
  goals.forEach((g, index) => {
    if (g.status === "completed" || g.status === "archived") return
    const health = computeListGoalHealth(g, now)
    const severity = ATTENTION_SEVERITY[health.status]
    if (severity === undefined) return
    flagged.push({
      goal: { ...g, health_status: health.status, health_reason: health.reason },
      severity,
      index,
    })
  })
  return flagged
    .sort((a, b) => a.severity - b.severity || a.index - b.index)
    .map((entry) => entry.goal)
}

/** A reminder counts as "due" for Morning Brief when it's active and its next
 * occurrence isn't in the future beyond today — this deliberately also
 * surfaces overdue ones (next_run_at in the past) rather than hiding them,
 * since a missed reminder is exactly what a morning brief should resurface. */
export function isReminderDueToday(reminder: Reminder, now: Date = new Date()): boolean {
  if (reminder.status !== "active" || !reminder.nextRunAt) return false
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return new Date(reminder.nextRunAt).getTime() <= endOfToday.getTime()
}

export function remindersDueToday(reminders: Reminder[], now: Date = new Date()): Reminder[] {
  return reminders.filter((r) => isReminderDueToday(r, now))
}

// ── Morning Brief ────────────────────────────────────────────────────────────

export interface MorningBriefTaskCounts {
  overdueCount: number
  scheduledCount: number
  anytimeCount: number
  completedCount: number
  totalCount: number
}

export interface MorningBrief {
  dateLabel: string
  streakDays: number
  taskCounts: MorningBriefTaskCounts
  habitsPending: Habit[]
  habitsDoneCount: number
  habitsTotalCount: number
  remindersToday: Reminder[]
  goalsAtRisk: Goal[]
}

export function buildMorningBrief(input: {
  now?: Date
  streakDays: number
  taskCounts: MorningBriefTaskCounts
  activeHabits: Habit[]
  todaysCheckins: HabitCheckIn[]
  reminders: Reminder[]
  goals: Goal[]
}): MorningBrief {
  const now = input.now ?? new Date()
  const completedHabitIds = new Set(
    input.todaysCheckins.filter((c) => c.completed).map((c) => c.habitId),
  )
  const habitsPending = input.activeHabits.filter((h) => !completedHabitIds.has(h.id))

  return {
    dateLabel: now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    streakDays: input.streakDays,
    taskCounts: input.taskCounts,
    habitsPending,
    habitsDoneCount: input.activeHabits.length - habitsPending.length,
    habitsTotalCount: input.activeHabits.length,
    remindersToday: remindersDueToday(input.reminders, now),
    goalsAtRisk: goalsNeedingAttention(input.goals, now),
  }
}

/** Compact plain-text block for the AI summary route — deliberately terse
 * (the model must only restate what's here, never add outside facts). */
export function formatMorningBriefContext(brief: MorningBrief): string {
  const lines = [
    `Date: ${brief.dateLabel}`,
    `Current streak: ${brief.streakDays} days`,
    `Tasks today: ${brief.taskCounts.overdueCount} overdue, ${brief.taskCounts.scheduledCount} scheduled, ${brief.taskCounts.anytimeCount} anytime, ${brief.taskCounts.completedCount} already done`,
    `Habits: ${brief.habitsDoneCount}/${brief.habitsTotalCount} checked in so far${brief.habitsPending.length > 0 ? ` (pending: ${brief.habitsPending.map((h) => h.label).join(", ")})` : ""}`,
  ]
  if (brief.remindersToday.length > 0)
    lines.push(`Reminders due: ${brief.remindersToday.map((r) => r.title).join(", ")}`)
  if (brief.goalsAtRisk.length > 0)
    lines.push(
      `Goals needing attention: ${brief.goalsAtRisk.map((g) => `${g.title} (${g.health_status})`).join(", ")}`,
    )
  return lines.join("\n")
}

// ── Evening Review ───────────────────────────────────────────────────────────

export interface EveningReviewSummary {
  dateLabel: string
  completedCount: number
  manualActivityCount: number
  hengoMinutes: number
  journalDone: boolean
  entryCount: number
}

export function buildEveningReviewSummary(
  todaySummary: DailySummary | undefined,
  hasJournalToday: boolean,
  now: Date = new Date(),
): EveningReviewSummary {
  return {
    dateLabel: now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    completedCount: todaySummary?.completedCount ?? 0,
    manualActivityCount: todaySummary?.manualActivityCount ?? 0,
    hengoMinutes: todaySummary?.hengoMinutes ?? 0,
    journalDone: hasJournalToday,
    entryCount: todaySummary?.entries.length ?? 0,
  }
}

export function formatEveningReviewContext(summary: EveningReviewSummary): string {
  return [
    `Date: ${summary.dateLabel}`,
    `Tasks/habits completed today: ${summary.completedCount}`,
    `Real-life activities logged: ${summary.manualActivityCount}`,
    `Time spent in Hengo today: ${summary.hengoMinutes} minutes`,
    `Journal entry written today: ${summary.journalDone ? "yes" : "no"}`,
  ].join("\n")
}

// ── Weekly Review ────────────────────────────────────────────────────────────

export interface HabitWeeklyCompletion {
  habitId: string
  label: string
  completedDays: number
  totalDays: number
}

/** `weekDates` is the set of local YYYY-MM-DD strings the week spans (see
 * `localWeekDates`) — `totalDays` only counts days on/after the habit's own
 * start date, so a habit started mid-week isn't penalized for days before it existed. */
export function buildHabitWeeklyCompletion(
  habits: Habit[],
  checkins: HabitCheckIn[],
  weekDates: string[],
): HabitWeeklyCompletion[] {
  const completedByHabit = new Map<string, Set<string>>()
  for (const c of checkins) {
    if (!c.completed) continue
    const set = completedByHabit.get(c.habitId) ?? new Set<string>()
    set.add(c.date)
    completedByHabit.set(c.habitId, set)
  }

  return habits.map((habit) => {
    const startedDate = habit.startedAt.slice(0, 10)
    const eligibleDays = weekDates.filter((d) => d >= startedDate)
    const completed = completedByHabit.get(habit.id) ?? new Set<string>()
    return {
      habitId: habit.id,
      label: habit.label,
      completedDays: eligibleDays.filter((d) => completed.has(d)).length,
      totalDays: eligibleDays.length,
    }
  })
}

/** The 7 local YYYY-MM-DD dates a week spans, given its Sunday start. */
export function localWeekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return toLocalDateString(d)
  })
}

export interface WeeklyReviewSummary {
  rangeLabel: string
  totalCompletedCount: number
  totalManualActivityCount: number
  totalHengoMinutes: number
  journalDaysCount: number
  habitCompletion: HabitWeeklyCompletion[]
  goalsAtRisk: Goal[]
}

export function buildWeeklyReviewSummary(
  daySummaries: DailySummary[],
  goals: Goal[],
  habitCompletion: HabitWeeklyCompletion[],
  rangeLabel: string,
  now: Date = new Date(),
): WeeklyReviewSummary {
  return {
    rangeLabel,
    totalCompletedCount: daySummaries.reduce((sum, d) => sum + d.completedCount, 0),
    totalManualActivityCount: daySummaries.reduce((sum, d) => sum + d.manualActivityCount, 0),
    totalHengoMinutes: daySummaries.reduce((sum, d) => sum + d.hengoMinutes, 0),
    journalDaysCount: daySummaries.filter((d) => d.journalCount > 0).length,
    habitCompletion,
    goalsAtRisk: goalsNeedingAttention(goals, now),
  }
}

export function formatWeeklyReviewContext(summary: WeeklyReviewSummary): string {
  const lines = [
    `Week: ${summary.rangeLabel}`,
    `Tasks/habits completed: ${summary.totalCompletedCount}`,
    `Real-life activities logged: ${summary.totalManualActivityCount}`,
    `Time spent in Hengo: ${summary.totalHengoMinutes} minutes`,
    `Days with a journal entry: ${summary.journalDaysCount}/7`,
  ]
  if (summary.habitCompletion.length > 0) {
    lines.push(
      `Habit completion: ${summary.habitCompletion.map((h) => `${h.label} ${h.completedDays}/${h.totalDays}`).join(", ")}`,
    )
  }
  if (summary.goalsAtRisk.length > 0) {
    lines.push(
      `Goals needing attention: ${summary.goalsAtRisk.map((g) => `${g.title} (${g.health_status})`).join(", ")}`,
    )
  }
  return lines.join("\n")
}
