// Pure, deterministic goal-health engine (Goal System v2 — see
// docs/goal-system-v2-audit.md). No AI here by design — this is the
// first-version heuristic the spec asks for before any AI enhancement layers
// on top of it. Every input is a plain value (the clock is passed in) so this
// is fully unit-testable and has no dependency on Supabase or React.
import { differenceInDays, parseISO } from "date-fns"
import { allKeyResultsAchieved, clampPercent, computeGoalProgress } from "@/lib/goal-progress"
import type { Goal, GoalHealthStatus } from "@/lib/goals"

export interface GoalHealthInput {
  /** Goal.status — "completed" short-circuits everything else. */
  goalStatus: string
  hasKeyResults: boolean
  /** Weighted key-result progress (0–100), or null if it can't be computed yet. */
  outcomeProgress: number | null
  allKeyResultsAchieved: boolean
  /** Total task count, used only to distinguish "not started" from "no key results yet but active". */
  activityTotalTasks: number
  /**
   * Completed task count. Only consulted for goals without key results, so a
   * goal whose every task is done isn't labelled "Needs attention" next to a
   * 100% task bar. Optional for callers that don't have it.
   */
  activityCompletedTasks?: number
  targetDate: string | null
  startDate: string | null
  noDuration: boolean
  now: Date
  /** Days since the most recent completed task/activity, or null if there's never been any. */
  daysSinceLastActivity: number | null
  overdueHighImpactTaskCount: number
}

export interface GoalHealth {
  status: GoalHealthStatus
  reason: string
}

const SEVERITY: Record<
  Extract<GoalHealthStatus, "on_track" | "attention" | "at_risk" | "blocked">,
  number
> = {
  on_track: 0,
  attention: 1,
  at_risk: 2,
  blocked: 3,
}

/**
 * Deterministic health status + a short human-readable reason. Priority
 * order: explicit completion > no-key-results fallback > all-KRs-achieved >
 * the most severe of {deadline pace, overdue high-impact tasks, inactivity}.
 */
export const computeGoalHealth = (input: GoalHealthInput): GoalHealth => {
  if (input.goalStatus === "completed") {
    return { status: "completed", reason: "Goal marked complete." }
  }

  if (!input.hasKeyResults) {
    if (input.activityTotalTasks === 0) {
      return {
        status: "not_started",
        reason:
          "No key results or tasks yet — add key results to start tracking real outcome progress.",
      }
    }
    // Every task done is not the same as the goal being achieved — there's no
    // outcome measure to say so — so it isn't "completed". But it isn't
    // behind either, and "Needs attention" beside a full task bar reads as a
    // contradiction. The status is on track; the reason asks the owner to
    // confirm the outcome. A passed deadline still needs a decision.
    if (
      input.activityCompletedTasks != null &&
      input.activityCompletedTasks >= input.activityTotalTasks
    ) {
      const deadlinePassed =
        !input.noDuration &&
        input.targetDate != null &&
        differenceInDays(parseISO(input.targetDate), input.now) < 0
      return deadlinePassed
        ? {
            status: "attention",
            reason:
              "All tasks are done and the deadline has passed — mark the goal complete if its outcome was reached.",
          }
        : {
            status: "on_track",
            reason:
              "All tasks are done — mark the goal complete once its outcome is reached, or add key results to measure it.",
          }
    }
    return {
      status: "attention",
      reason: "No key results defined yet — showing legacy task-completion activity only.",
    }
  }

  if (input.allKeyResultsAchieved) {
    return { status: "on_track", reason: "All key results are complete." }
  }

  const outcomeProgress = input.outcomeProgress ?? 0
  const candidates: { status: "attention" | "at_risk" | "blocked"; reason: string }[] = []

  if (!input.noDuration && input.targetDate) {
    const target = parseISO(input.targetDate)
    const start = input.startDate ? parseISO(input.startDate) : input.now
    const totalDays = differenceInDays(target, start)
    const daysElapsed = differenceInDays(input.now, start)
    const daysRemaining = differenceInDays(target, input.now)

    if (daysRemaining < 0) {
      const overdueDays = Math.abs(daysRemaining)
      candidates.push({
        status: "blocked",
        reason: `Deadline passed ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago with outcome progress at ${Math.round(outcomeProgress)}%.`,
      })
    } else if (totalDays > 0) {
      const expectedProgress = clampPercent((daysElapsed / totalDays) * 100)
      const deficit = expectedProgress - outcomeProgress
      if (deficit > 25) {
        candidates.push({
          status: "at_risk",
          reason: `Progress is ${Math.round(deficit)}% behind the expected pace.`,
        })
      } else if (deficit > 10) {
        candidates.push({
          status: "attention",
          reason: `Progress is ${Math.round(deficit)}% behind the expected pace.`,
        })
      }
    }
  }

  if (input.overdueHighImpactTaskCount > 0) {
    candidates.push({
      status: input.overdueHighImpactTaskCount >= 3 ? "at_risk" : "attention",
      reason: `${input.overdueHighImpactTaskCount} overdue high-impact task${input.overdueHighImpactTaskCount === 1 ? "" : "s"} need attention.`,
    })
  }

  if (input.daysSinceLastActivity != null && input.daysSinceLastActivity >= 7) {
    candidates.push({
      status: input.daysSinceLastActivity >= 14 ? "at_risk" : "attention",
      reason: `No high-impact action has been completed in ${input.daysSinceLastActivity} days.`,
    })
  }

  if (candidates.length === 0) {
    return { status: "on_track", reason: "Progress matches the expected pace." }
  }

  return candidates.reduce((worst, candidate) =>
    SEVERITY[candidate.status] > SEVERITY[worst.status] ? candidate : worst,
  )
}

/**
 * Health for a goal as it appears in a list (the Goals page, Overview's
 * Active goals card), from the goal row alone. Lists don't fetch each goal's
 * task detail, so the overdue-high-impact and inactivity signals are omitted
 * (0 / null) — the goal detail page computes those from its full task list.
 */
export const computeListGoalHealth = (goal: Goal, now: Date): GoalHealth => {
  const progress = computeGoalProgress(goal.taskCounts, goal.keyResults ?? [])
  return computeGoalHealth({
    goalStatus: goal.status,
    hasKeyResults: progress.hasActiveKeyResults,
    outcomeProgress: progress.outcomeProgress,
    allKeyResultsAchieved: progress.hasActiveKeyResults
      ? allKeyResultsAchieved(goal.keyResults ?? [])
      : false,
    activityTotalTasks: progress.activityProgress.total,
    activityCompletedTasks: progress.activityProgress.completed,
    targetDate: goal.target_date,
    startDate: goal.metadata?.start_date ?? null,
    noDuration: Boolean(goal.no_duration || goal.metadata?.no_duration),
    now,
    daysSinceLastActivity: null,
    overdueHighImpactTaskCount: 0,
  })
}
