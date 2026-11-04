"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CalendarClock } from "lucide-react"

import {
  DASHBOARD_ROW,
  DASHBOARD_ROWS,
  DashboardCard,
  DashboardNote,
} from "@/components/home/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"
import { DeadlineStatusBadge } from "@/components/goals/DeadlineStatusBadge"
import { useGoals } from "@/hooks/useGoals"
import { calculateGoalDeadlineInfo } from "@/lib/goals"
import { cn } from "@/lib/utils"

// Cross-goal deadline list for the Goals Overview — the Goals page only
// surfaces a single "N overdue" count, not a ranked list, so this composes
// sortedGoals + calculateGoalDeadlineInfo into one. Overdue goals sort first
// (negative days remaining), so it also covers what the old amber banner said.
export function UpcomingDeadlines({ limit = 5 }: { limit?: number }) {
  const { sortedGoals, isLoading, isError } = useGoals()

  const upcoming = useMemo(
    () =>
      sortedGoals
        .filter((g) => g.status !== "completed" && g.status !== "archived" && g.target_date)
        .map((goal) => ({ goal, info: calculateGoalDeadlineInfo(goal) }))
        .filter(({ info }) => info.status !== "completed")
        .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining)
        .slice(0, limit),
    [sortedGoals, limit],
  )

  return (
    <DashboardCard title="Upcoming deadlines" icon={CalendarClock}>
      {isLoading ? (
        <div className="space-y-2 py-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <DashboardNote tone="error">Couldn&apos;t load your deadlines.</DashboardNote>
      ) : upcoming.length === 0 ? (
        <DashboardNote>No goals with a deadline coming up.</DashboardNote>
      ) : (
        <ul className={DASHBOARD_ROWS}>
          {upcoming.map(({ goal, info }) => (
            <li key={goal.id}>
              <Link
                href={`/goals/${goal.id}`}
                className={cn(
                  DASHBOARD_ROW,
                  "flex-wrap justify-between gap-x-3 gap-y-1 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="line-clamp-2 min-w-0 flex-1 basis-40 break-words text-base text-foreground">
                  {goal.title}
                </span>
                <DeadlineStatusBadge deadlineInfo={info} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
