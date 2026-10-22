"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Star, Target } from "lucide-react"

import { HealthBadge } from "@/components/goals/HealthBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { goalsQueryKey } from "@/hooks/useGoals"
import { goalsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { goalTaskProgress, selectActiveGoals } from "@/lib/home-dashboard"

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
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target size={14} strokeWidth={2.5} className="text-violet-500" />
          Active goals
        </h3>
        <Link
          href="/goals"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertTriangle size={16} className="shrink-0" />
          Couldn&apos;t load your goals.
        </div>
      ) : goals.length === 0 ? (
        <div className="mt-3 rounded-lg border border-border bg-accent/5 px-3 py-3 text-sm text-muted-foreground">
          No active goals.{" "}
          <Link href="/goals" className="font-medium text-primary hover:underline">
            Set one
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {goals.map((goal) => {
            const progress = goalTaskProgress(goal)
            return (
              <li key={goal.id}>
                <Link
                  href={`/goals/${goal.id}`}
                  className="block rounded-lg border border-border bg-background/40 px-3 py-2.5 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <div className="flex items-center gap-2">
                    {goal.isStarred && (
                      <Star
                        size={13}
                        className="shrink-0 fill-amber-400 text-amber-400"
                        aria-label="Starred"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {goal.title}
                    </span>
                    <HealthBadge status={goal.health_status} reason={goal.health_reason} />
                  </div>
                  {progress && (
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`${goal.title} task progress`}
                        aria-valuenow={progress.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {progress.completed}/{progress.total} tasks
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
