"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Target } from "lucide-react"

import {
  DASHBOARD_ROW,
  DASHBOARD_ROWS,
  DashboardCard,
  DashboardNote,
} from "@/components/home/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"
import { DeadlineStatusBadge } from "@/components/goals/DeadlineStatusBadge"
import { useGoals } from "@/hooks/useGoals"
import { calculateGoalDeadlineInfo, type Goal } from "@/lib/goals"
import { cn } from "@/lib/utils"

const taskProgress = (goal: Goal) =>
  goal.taskCounts && goal.taskCounts.total > 0
    ? Math.round((goal.taskCounts.completed / goal.taskCounts.total) * 100)
    : 0

// Compact, dashboard-sized view of the user's active goals. Reuses the shared
// useGoals query (cache-shared with /goals), shows the top few by sort order.
// Rows follow the Goals list: neutral icon tile, two-line title, one-colour
// progress bar (low progress isn't an error), deadline and task count.
export function GoalsOverview({ className, limit = 3 }: { className?: string; limit?: number }) {
  const { sortedGoals, isLoading, isError } = useGoals()

  const activeGoals = useMemo(
    () => sortedGoals.filter((g) => g.status !== "completed" && g.status !== "archived"),
    [sortedGoals],
  )
  const visible = activeGoals.slice(0, limit)

  return (
    <DashboardCard
      title="Your goals"
      icon={Target}
      action={{ href: "/goals", label: "View all" }}
      className={className}
    >
      {isLoading ? (
        <div className="space-y-2 py-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <DashboardNote tone="error">Couldn&apos;t load your goals.</DashboardNote>
      ) : visible.length === 0 ? (
        <DashboardNote>
          No active goals.{" "}
          <Link href="/goals/create" className="font-medium text-primary hover:underline">
            Create a goal
          </Link>
        </DashboardNote>
      ) : (
        <ul className={DASHBOARD_ROWS}>
          {visible.map((goal) => {
            const deadlineInfo = calculateGoalDeadlineInfo(goal)
            const progress = taskProgress(goal)
            const icon = goal.metadata?.icon
            return (
              <li key={goal.id}>
                <Link
                  href={`/goals/${goal.id}`}
                  className={cn(
                    DASHBOARD_ROW,
                    "items-start gap-3 py-3 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-base font-semibold text-foreground"
                  >
                    {icon || (goal.title ? goal.title.charAt(0).toUpperCase() : "G")}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 min-w-0 break-words text-base font-medium text-foreground">
                        {goal.title}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {progress}%
                      </span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <DeadlineStatusBadge deadlineInfo={deadlineInfo} size="sm" />
                      {goal.taskCounts && goal.taskCounts.total > 0 && (
                        <span className="tabular-nums">
                          {goal.taskCounts.completed}/{goal.taskCounts.total} tasks
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}

export default GoalsOverview
