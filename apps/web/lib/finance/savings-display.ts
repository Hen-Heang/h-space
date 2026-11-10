// Display-only helpers for the Savings page (components/finance/savings).
//
// Same formulas the goal cards and summary tiles used inline before the
// redesign, moved here so the wording and edge cases are tested.
import { usd } from "@/lib/finance-format"
import type { SavingsGoal } from "@/types/finance"

const DAY_MS = 86_400_000

export type SavingsTotals = {
  count: number
  totalSavedUsd: number
  totalTargetUsd: number
  overallPct: number
  reachedCount: number
}

export function isGoalReached(goal: Pick<SavingsGoal, "targetUsd" | "currentUsd">): boolean {
  return goal.targetUsd > 0 && goal.currentUsd >= goal.targetUsd
}

export function savingsTotals(goals: SavingsGoal[]): SavingsTotals {
  const totalSavedUsd = goals.reduce((sum, goal) => sum + goal.currentUsd, 0)
  const totalTargetUsd = goals.reduce((sum, goal) => sum + goal.targetUsd, 0)
  return {
    count: goals.length,
    totalSavedUsd,
    totalTargetUsd,
    overallPct: totalTargetUsd > 0 ? Math.round((totalSavedUsd / totalTargetUsd) * 100) : 0,
    reachedCount: goals.filter(isGoalReached).length,
  }
}

export type GoalProgress = { pct: number; remainingUsd: number; reached: boolean }

export function goalProgress(goal: Pick<SavingsGoal, "targetUsd" | "currentUsd">): GoalProgress {
  return {
    pct: goal.targetUsd > 0 ? Math.round((goal.currentUsd / goal.targetUsd) * 100) : 0,
    remainingUsd: Math.max(goal.targetUsd - goal.currentUsd, 0),
    reached: isGoalReached(goal),
  }
}

/** "$1,200.00 of $5,000.00" */
export function savedOfTargetLabel(currentUsd: number, targetUsd: number): string {
  return `${usd.format(currentUsd)} of ${usd.format(targetUsd)}`
}

/** "$3,800.00 to go", or "Target reached". */
export function goalRemainingLabel(progress: GoalProgress): string {
  return progress.reached ? "Target reached" : `${usd.format(progress.remainingUsd)} to go`
}

export function goalsReachedLabel(reachedCount: number, count: number): string {
  return `${reachedCount} of ${count} ${count === 1 ? "goal" : "goals"} reached`
}

export type GoalDeadline = {
  /** "Mar 1, 2027" */
  date: string
  /** "12d left" · "Due today" · "Overdue"; null once the target is reached. */
  status: string | null
  overdue: boolean
}

/** The target date line, or null when the goal has no (valid) deadline. */
export function goalDeadline(
  goal: Pick<SavingsGoal, "deadline" | "targetUsd" | "currentUsd">,
  now: number = Date.now(),
): GoalDeadline | null {
  if (!goal.deadline) return null
  const due = new Date(`${goal.deadline}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const date = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (isGoalReached(goal)) return { date, status: null, overdue: false }
  const days = Math.ceil((due.getTime() - now) / DAY_MS)
  if (days > 0) return { date, status: `${days}d left`, overdue: false }
  if (days === 0) return { date, status: "Due today", overdue: false }
  return { date, status: "Overdue", overdue: true }
}
