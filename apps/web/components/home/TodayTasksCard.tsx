"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { CheckCircle2, Circle } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { RowList } from "@/components/ui/row-list"
import { useTodaysTasks } from "@/hooks/useTodaysTasks"

import { DashboardNote } from "./dashboard-card"
import { HOME_ROW } from "./home-primitives"

const VISIBLE_LIMIT = 3

/** Where a task row leads: its goal (focused on the task), or the calendar. */
function taskHref(task: { id: string; goal_id?: string | null }) {
  return task.goal_id ? `/goals/${task.goal_id}?task=${task.id}` : "/goals/calendar"
}

/**
 * Compact "Today's tasks" widget for the Today page — shares useTodaysTasks'
 * query cache with the full Tasks tab (/goals/tasks) and Goals Overview's
 * GoalTasksSnapshot, so mounting this here never triggers an extra fetch.
 * Overdue tasks surface first; anything past the 3-item cap is reachable via
 * "View all" rather than rendered here.
 *
 * Each row is two sibling controls — the completion toggle and a link to the
 * task — never a button nested inside a clickable row.
 */
export function TodayTasksCard() {
  const { groups, totalCount, loading, error, handleToggleTaskCompletion } = useTodaysTasks()

  const pending = [...groups.overdue, ...groups.scheduled, ...groups.anytime]
  const visible = pending.slice(0, VISIBLE_LIMIT)
  const remaining = Math.max(0, pending.length - VISIBLE_LIMIT)
  const allDone = totalCount > 0 && pending.length === 0

  return (
    <div>
      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : error ? (
        <DashboardNote tone="error">Couldn&apos;t load today&apos;s tasks.</DashboardNote>
      ) : totalCount === 0 ? (
        <DashboardNote>
          No tasks for today.{" "}
          <Link href="/goals/tasks" className="font-medium text-primary hover:underline">
            Add one
          </Link>
        </DashboardNote>
      ) : allDone ? (
        <motion.p
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center gap-2 py-2 text-sm font-medium text-success"
        >
          <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
          All tasks done for today.
        </motion.p>
      ) : (
        <>
          <RowList aria-label="Today’s pending tasks">
            <AnimatePresence initial={false}>
              {visible.map((task) => {
                const overdue = groups.isOverdue(task)
                const title = task.title || task.description
                return (
                  <motion.li
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={HOME_ROW}
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      aria-label={
                        task.completed ? `Mark "${title}" incomplete` : `Mark "${title}" complete`
                      }
                      onClick={() => void handleToggleTaskCompletion(task.id, task.completed)}
                      className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                      ) : (
                        <Circle className="size-5" aria-hidden="true" />
                      )}
                    </motion.button>
                    <Link
                      href={taskHref(task)}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="line-clamp-2 min-w-0 flex-1 break-words text-base text-foreground">
                        {title}
                      </span>
                      {overdue && (
                        <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Overdue
                        </span>
                      )}
                    </Link>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </RowList>
          {remaining > 0 && (
            <p className="pt-2 text-sm text-muted-foreground">
              +{remaining} more task{remaining === 1 ? "" : "s"} today
            </p>
          )}
        </>
      )}
    </div>
  )
}
