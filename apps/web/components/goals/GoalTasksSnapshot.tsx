"use client"

import Link from "next/link"
import { CheckCircle2, Circle, ClipboardList } from "lucide-react"

import {
  DASHBOARD_ROW,
  DASHBOARD_ROWS,
  DashboardCard,
  DashboardNote,
} from "@/components/home/dashboard-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTodaysTasks } from "@/hooks/useTodaysTasks"
import { cn } from "@/lib/utils"

const LIMIT = 5

/**
 * Read-only-ish snapshot of today's goal-linked tasks for the Goals Overview
 * tab — shares useTodaysTasks' query cache with the Tasks tab (same query
 * key), so this never triggers an extra fetch. It's deliberately a filtered
 * slice (goal_id set, capped, no composer/filter/mark-all chrome), not a
 * second copy of the full Today's Tasks experience — that stays the Tasks
 * tab's job alone (see components/goals/TodaysTasks.tsx).
 *
 * Each row is two sibling controls — the completion toggle and a link to the
 * task — never a button nested inside a clickable row.
 */
export function GoalTasksSnapshot() {
  const { tasks, loading, error, goalTitleById, handleToggleTaskCompletion } = useTodaysTasks()

  const goalTasks = tasks.filter((t) => t.goal_id).slice(0, LIMIT)

  return (
    <DashboardCard
      title="Goal tasks today"
      icon={ClipboardList}
      action={{ href: "/goals/tasks", label: "View all" }}
    >
      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : error ? (
        <DashboardNote tone="error">Couldn&apos;t load today&apos;s goal tasks.</DashboardNote>
      ) : goalTasks.length === 0 ? (
        <DashboardNote>No goal tasks due today.</DashboardNote>
      ) : (
        <ul className={DASHBOARD_ROWS}>
          {goalTasks.map((task) => {
            const title = task.title || task.description
            const goalTitle = task.goal_id ? goalTitleById[task.goal_id] : undefined
            return (
              <li key={task.id} className={DASHBOARD_ROW}>
                <button
                  type="button"
                  aria-label={
                    task.completed ? `Mark "${title}" incomplete` : `Mark "${title}" complete`
                  }
                  onClick={() => void handleToggleTaskCompletion(task.id, task.completed)}
                  className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                >
                  {task.completed ? (
                    <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  ) : (
                    <Circle className="size-5" aria-hidden="true" />
                  )}
                </button>
                <Link
                  href={`/goals/${task.goal_id}?task=${task.id}`}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md px-1 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "line-clamp-2 break-words text-base text-foreground",
                      task.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {title}
                  </span>
                  {goalTitle && (
                    <span className="truncate text-xs text-muted-foreground">{goalTitle}</span>
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
