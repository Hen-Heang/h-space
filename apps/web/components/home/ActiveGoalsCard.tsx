"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Star, Target } from "lucide-react"

import { HealthBadge } from "@/components/goals/HealthBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { goalsQueryKey } from "@/hooks/useGoals"
import { goalsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { computeListGoalHealth } from "@/lib/goal-health"
import { goalTaskProgress, selectActiveGoals } from "@/lib/home-dashboard"

import { DASHBOARD_ROW, DASHBOARD_ROWS, DashboardCard, DashboardNote } from "./dashboard-card"

/**
 * Compact "Active goals" widget for Today. Reads the same `goalsQueryKey`
 * cache as /goals, so it never adds a fetch when Goals was already visited.
 * Progress shown is task completion — the only measure every goal has.
 */
export function ActiveGoalsCard() {
  const userId = getUserId()
  const {
    data = [],
    isPending: loading,
    isError: error,
  } = useQuery({
    queryKey: goalsQueryKey(userId),
    queryFn: () => goalsApi.list(),
    enabled: userId != null,
  })
  const goals = selectActiveGoals(data)

  return (
    <DashboardCard
      title="Active goals"
      icon={Target}
      action={{ href: "/goals", label: "View all" }}
    >
      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ) : error ? (
        <DashboardNote tone="error">Couldn&apos;t load your goals.</DashboardNote>
      ) : goals.length === 0 ? (
        <DashboardNote>
          No active goals.{" "}
          <Link href="/goals" className="font-medium text-primary hover:underline">
            Set one
          </Link>
        </DashboardNote>
      ) : (
        <ul className={DASHBOARD_ROWS}>
          {goals.map((goal) => {
            const progress = goalTaskProgress(goal)
            // Live, same as the Goals list — the stored health_status only
            // refreshes when the goal's detail page is opened.
            const health = computeListGoalHealth(goal, new Date())
            return (
              <li key={goal.id}>
                <Link
                  href={`/goals/${goal.id}`}
                  className={`${DASHBOARD_ROW} flex-col items-stretch gap-1.5 py-2.5 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    {goal.isStarred && (
                      <Star
                        size={14}
                        className="mt-1 shrink-0 fill-amber-400 text-amber-400"
                        aria-label="Starred"
                      />
                    )}
                    <span className="line-clamp-2 min-w-0 flex-1 break-words text-base font-medium text-foreground">
                      {goal.title}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <HealthBadge status={health.status} reason={health.reason} />
                    {progress && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {progress.completed}/{progress.total} tasks
                      </span>
                    )}
                  </span>
                  {progress && (
                    <span
                      className="block h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${goal.title} task progress`}
                      aria-valuenow={progress.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
