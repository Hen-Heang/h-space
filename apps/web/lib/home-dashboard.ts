// Pure selectors behind the /home daily dashboard. Kept framework-free so the
// card components stay thin and this logic stays unit-testable.

import type { Goal } from "@/lib/goals"

const INACTIVE_GOAL_STATUSES = new Set(["completed", "archived"])

/**
 * Goals worth surfacing on Today: not completed/archived, starred first, then
 * the nearest target date (undated last), then most recently created.
 */
export function selectActiveGoals(goals: Goal[], limit = 3): Goal[] {
  const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Infinity)
  return goals
    .filter((g) => !INACTIVE_GOAL_STATUSES.has(g.status))
    .sort((a, b) => {
      const star = Number(!!b.isStarred) - Number(!!a.isStarred)
      if (star !== 0) return star
      const due = time(a.target_date) - time(b.target_date)
      if (due !== 0 && !Number.isNaN(due)) return due
      return time(b.created_at) - time(a.created_at)
    })
    .slice(0, limit)
}

/** Task completion for a goal, or null when it has no tasks to measure. */
export function goalTaskProgress(
  goal: Goal,
): { completed: number; total: number; pct: number } | null {
  const counts = goal.taskCounts
  if (!counts || counts.total === 0) return null
  return {
    completed: counts.completed,
    total: counts.total,
    pct: Math.round((counts.completed / counts.total) * 100),
  }
}

/**
 * Maps the Quick Switcher's recent nav ids to known destinations, dropping
 * ids that no longer exist, duplicates, and the page currently open.
 */
export function resolveRecentDestinations<T extends { id: string }>(
  recentIds: string[],
  itemsById: ReadonlyMap<string, T>,
  { excludeIds = [], limit = 4 }: { excludeIds?: string[]; limit?: number } = {},
): T[] {
  const seen = new Set(excludeIds)
  const out: T[] = []
  for (const id of recentIds) {
    if (seen.has(id)) continue
    const item = itemsById.get(id)
    if (!item) continue
    seen.add(id)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}
