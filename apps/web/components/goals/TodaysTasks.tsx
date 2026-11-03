"use client"

import React, { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { motion, AnimatePresence } from "motion/react"
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTodaysTasks } from "@/hooks/useTodaysTasks"
import { bumpEndAfterStart } from "@/lib/calendar"
import { DEFAULT_TASK_COLOR, TASK_COLORS, type Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"

// Ported from Orbit dashboard/TodaysTasks.tsx. Goal multi-select filter, quick
// add, progress, overdue/scheduled/anytime/completed grouping, and mark-all +
// undo are kept. Sharing / select-mode (deferred) are dropped.

interface TodaysTasksProps {
  className?: string
}

export function TodaysTasks({ className }: TodaysTasksProps) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  // Composer: a single inline "Google Tasks"-style entry that expands on
  // focus to reveal goal/time/description/color instead of a separate modal
  // duplicating the same choices.
  const [composerOpen, setComposerOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [isAnytime, setIsAnytime] = useState(true)
  const [dailyStart, setDailyStart] = useState("09:00")
  const [dailyEnd, setDailyEnd] = useState("10:00")
  const [color, setColor] = useState<string>(DEFAULT_TASK_COLOR)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Details and colour are optional; they stay folded until asked for.
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const {
    tasks,
    loading,
    error,
    availableGoals,
    selectedGoalIds,
    newTaskTitle,
    setNewTaskTitle,
    newTaskGoalId,
    setNewTaskGoalId,
    isMarkingAll,
    canUndo,
    completedCount,
    totalCount,
    progressPct,
    groups,
    goalTitleById,
    toggleGoal,
    toggleAll,
    createTask,
    handleToggleTaskCompletion,
    handleMarkAllCompleted,
    handleUndoMarkAllCompleted,
    editTask,
    deleteTask,
  } = useTodaysTasks()

  const resetComposer = () => {
    setNewTaskTitle("")
    setDescription("")
    setIsAnytime(true)
    setDailyStart("09:00")
    setDailyEnd("10:00")
    setColor(DEFAULT_TASK_COLOR)
    setTimeError(null)
    setShowMoreOptions(false)
    setComposerOpen(false)
  }

  const handleStartTimeChange = (value: string) => {
    const v = value || "09:00"
    setDailyStart(v)
    setTimeError(null)
    setDailyEnd((prev) => bumpEndAfterStart(v, prev))
  }

  // Single submit path for both the collapsed fast-add (title only, Anytime
  // today) and the expanded form — whatever fields are currently set apply,
  // so there's exactly one way a task gets created.
  const submitTask = async () => {
    const title = newTaskTitle.trim()
    if (!title || submitting) return
    if (!isAnytime && dailyEnd <= dailyStart) {
      setTimeError("End time must be after start time.")
      return
    }
    setSubmitting(true)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
    try {
      await createTask({
        title,
        description: description.trim() || title,
        goal_id: newTaskGoalId,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        daily_start_time: isAnytime ? null : dailyStart,
        daily_end_time: isAnytime ? null : dailyEnd,
        is_anytime: isAnytime,
        color,
        completed: false,
      })
      resetComposer()
    } catch {
      /* toast already shown by createTask */
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = (task: Task) => {
    setEditingId(task.id)
    setEditingValue(task.title || task.description || "")
  }

  const commitEdit = () => {
    if (editingId) void editTask(editingId, editingValue)
    setEditingId(null)
    setEditingValue("")
  }

  const allSelected = availableGoals.length > 0 && selectedGoalIds.length === availableGoals.length

  // Where a task row leads — its goal (focused on the task), or the calendar
  // for a standalone task. Same destinations the row used to router.push to.
  const taskHref = (task: Task) =>
    task.goal_id ? `/goals/${task.goal_id}?task=${task.id}` : "/goals/calendar"

  const renderProgress = () => {
    if (totalCount === 0) return null
    const allDone = completedCount === totalCount
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className={cn(allDone ? "text-success" : "text-muted-foreground")}>
            {allDone ? "All tasks done" : "Daily progress"}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn(
              "h-full w-full origin-left rounded-full",
              allDone ? "bg-success" : "bg-primary",
            )}
            initial={false}
            animate={{ scaleX: progressPct / 100 }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>
    )
  }

  const newTaskGoalTitle = newTaskGoalId ? goalTitleById[newTaskGoalId] : null

  const renderQuickAdd = () => (
    <div
      className={cn(
        "rounded-lg border bg-background transition-colors",
        composerOpen ? "border-primary/50" : "border-border",
      )}
    >
      <div className="flex min-h-11 items-center gap-2 px-3.5">
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onFocus={() => setComposerOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void submitTask()
            }
            if (e.key === "Escape") resetComposer()
          }}
          placeholder="Add a task for today…"
          aria-label="New task title"
          // text-base: 16px keeps iOS Safari from zooming the page on focus.
          className="h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {!composerOpen && (
          <Button
            size="sm"
            onClick={() => void submitTask()}
            disabled={!newTaskTitle.trim() || submitting}
            className="shrink-0"
          >
            Add
          </Button>
        )}
      </div>

      {composerOpen && (
        <div className="space-y-3 border-t border-border/60 px-3.5 pb-3.5 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {availableGoals.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors",
                      newTaskGoalId
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {newTaskGoalTitle ? (
                      <span className="max-w-[160px] truncate">{newTaskGoalTitle}</span>
                    ) : (
                      "No goal"
                    )}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 rounded-lg p-2 shadow-lg">
                  <DropdownMenuLabel className="px-3 pt-2 text-xs font-medium text-muted-foreground">
                    Assign to
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onSelect={() => setNewTaskGoalId(null)}
                    className={cn(
                      "rounded-lg font-medium",
                      !newTaskGoalId && "bg-primary/10 text-primary",
                    )}
                  >
                    No goal (standalone)
                  </DropdownMenuItem>
                  <div className="max-h-56 overflow-y-auto">
                    {availableGoals.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onSelect={() => setNewTaskGoalId(g.id)}
                        className={cn(
                          "rounded-lg font-medium",
                          newTaskGoalId === g.id && "bg-primary/10 text-primary",
                        )}
                      >
                        <span className="truncate">{g.title || "Untitled"}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              type="button"
              onClick={() => {
                setIsAnytime((v) => !v)
                setTimeError(null)
              }}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors",
                !isAnytime
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {isAnytime ? "Anytime" : `${dailyStart}–${dailyEnd}`}
            </button>
          </div>

          {!isAnytime && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Start time"
                value={dailyStart}
                onChange={(e) => handleStartTimeChange(e.target.value || "09:00")}
                className="h-11 min-w-0 rounded-lg border border-border bg-background px-2 text-base outline-none [color-scheme:light] focus-visible:border-ring dark:[color-scheme:dark]"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="time"
                aria-label="End time"
                value={dailyEnd}
                onChange={(e) => {
                  setDailyEnd(e.target.value || "10:00")
                  setTimeError(null)
                }}
                className="h-11 min-w-0 rounded-lg border border-border bg-background px-2 text-base outline-none [color-scheme:light] focus-visible:border-ring dark:[color-scheme:dark]"
              />
            </div>
          )}
          {timeError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {timeError}
            </p>
          )}

          {showMoreOptions && (
            <>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details…"
                aria-label="Task details"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />

              {/* Wraps instead of one 9-swatch row, which clipped at 320px. */}
              <div
                role="group"
                aria-label="Task colour"
                className="flex flex-wrap items-center gap-1"
              >
                {TASK_COLORS.map((c) => {
                  const selected = color.toLowerCase() === c.value.toLowerCase()
                  return (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      aria-label={c.name}
                      aria-pressed={selected}
                      onClick={() => setColor(c.value)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
                    >
                      <span
                        aria-hidden
                        className="h-5 w-5 rounded-full"
                        style={{
                          backgroundColor: c.value,
                          boxShadow: selected
                            ? `0 0 0 2px var(--background, #fff), 0 0 0 3.5px ${c.value}`
                            : "inset 0 0 0 1px rgba(0,0,0,0.12)",
                        }}
                      />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showMoreOptions}
              onClick={() => setShowMoreOptions((v) => !v)}
              className="-ml-2 gap-1 text-muted-foreground"
            >
              {showMoreOptions ? "Fewer options" : "More options"}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showMoreOptions && "rotate-180")}
                aria-hidden="true"
              />
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetComposer}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void submitTask()}
                disabled={!newTaskTitle.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-label="Adding task" />
                ) : (
                  "Add task"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => (canUndo ? handleUndoMarkAllCompleted() : handleMarkAllCompleted())}
        disabled={isMarkingAll || (!canUndo && completedCount === totalCount)}
        className="gap-2"
      >
        {isMarkingAll ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : canUndo ? (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
        )}
        {isMarkingAll ? "Marking…" : canUndo ? "Undo" : "Mark all complete"}
      </Button>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Filter goals
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-lg p-2 shadow-lg">
            <DropdownMenuLabel className="px-3 pt-2 text-xs font-medium text-muted-foreground">
              Show tasks from
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuCheckboxItem
              checked={allSelected}
              onCheckedChange={() => toggleAll()}
              onSelect={(e) => e.preventDefault()}
              className="rounded-lg font-medium"
            >
              All goals
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator className="my-2" />
            <div className="max-h-56 overflow-y-auto">
              {availableGoals.map((g) => (
                <DropdownMenuCheckboxItem
                  key={g.id}
                  checked={selectedGoalIds.includes(g.id)}
                  onCheckedChange={() => toggleGoal(g.id)}
                  onSelect={(e) => e.preventDefault()}
                  className="rounded-lg font-medium"
                >
                  <span className="truncate">{g.title || "Untitled"}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  // A divided row: the completion toggle, the title as a real link that
  // covers the row (stretched ::after), and one always-visible ⋯ menu for
  // Edit/Delete. The menu used to be two hover-only 28px buttons, which a
  // touch screen never showed at all.
  const renderTaskItem = (task: Task) => {
    const overdue = groups.isOverdue(task)
    const goalTitle = task.goal_id ? goalTitleById[task.goal_id] : null
    const title = task.title || task.description
    const isEditing = editingId === task.id
    return (
      <motion.li
        key={task.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group/item relative flex items-start gap-2 py-2 transition-colors hover:bg-accent/40 sm:gap-3"
      >
        <button
          type="button"
          aria-label={task.completed ? `Mark "${title}" incomplete` : `Mark "${title}" complete`}
          onClick={() => void handleToggleTaskCompletion(task.id, task.completed)}
          className={cn(
            "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-md outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
            task.completed ? "text-success" : "text-muted-foreground hover:text-primary",
          )}
        >
          {task.completed ? (
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Circle className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1 pt-2.5">
          {isEditing ? (
            <input
              autoFocus
              aria-label="Task title"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit()
                if (e.key === "Escape") {
                  setEditingId(null)
                  setEditingValue("")
                }
              }}
              onBlur={commitEdit}
              className="relative z-10 -my-1 w-full rounded-md border border-primary/50 bg-background px-2 py-1 text-base outline-none"
            />
          ) : (
            <Link
              href={taskHref(task)}
              className={cn(
                "block break-words text-base leading-snug outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring",
                task.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground group-hover/item:text-primary",
              )}
            >
              {title}
            </Link>
          )}
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
            <span
              className={cn(
                "flex items-center gap-1.5",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {overdue && "Overdue · "}
              {task.is_anytime ? "Anytime" : task.daily_start_time?.slice(0, 5)}
            </span>
            {goalTitle && (
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{goalTitle}</span>
              </span>
            )}
          </div>
        </div>

        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for "${title}"`}
                className="relative z-10 shrink-0 text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-lg p-2 shadow-md">
              <DropdownMenuItem
                className="rounded-lg font-medium"
                onSelect={() => startEditing(task)}
              >
                <Pencil className="mr-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="rounded-lg font-medium"
                onSelect={() => void deleteTask(task.id)}
              >
                <Trash2 className="mr-3 h-4 w-4" aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.li>
    )
  }

  const sectionHeader = (label: string, count: number, tone?: "danger") => (
    <li key={`${label}-header`} className="flex items-center gap-2 pb-1 pt-3" aria-hidden="true">
      <span
        className={cn(
          "text-sm font-semibold",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
    </li>
  )

  const renderGroup = (label: string, list: Task[], tone?: "danger") =>
    list.length > 0 && (
      <React.Fragment key={`${label}-group`}>
        {sectionHeader(label, list.length, tone)}
        {list.map((t) => renderTaskItem(t))}
      </React.Fragment>
    )

  // The page's title lives in the shell header ("Tasks"); this card says
  // which day it is and holds the list — no second heading block, and no
  // collapse toggle that could hide the page's only content on phones.
  return (
    <section
      aria-label={`Tasks for ${format(new Date(), "EEEE, MMMM d")}`}
      className={cn("app-surface flex min-w-0 flex-col p-4 sm:p-5", className)}
    >
      <p className="text-sm font-medium text-muted-foreground">
        {format(new Date(), "EEEE, MMM d")}
      </p>

      <div className="mt-3 space-y-4">
        {totalCount > 0 && renderProgress()}
        {renderQuickAdd()}
        {renderActions()}
        {loading ? (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        ) : error ? (
          <p role="alert" className="flex items-start gap-2 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Couldn&apos;t load today&apos;s tasks. Refresh the page to try again.
          </p>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All clear"
            description="No tasks left for today."
            className="py-8"
          />
        ) : (
          <ul className="-mx-1 divide-y divide-border">
            <AnimatePresence initial={false}>
              {renderGroup("Overdue", groups.overdue, "danger")}
              {renderGroup("Scheduled", groups.scheduled)}
              {renderGroup("Anytime", groups.anytime)}
              {groups.completed.length > 0 && (
                <React.Fragment key="completed-group">
                  <li key="completed-toggle">
                    <button
                      type="button"
                      aria-expanded={showCompleted}
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-sm font-semibold text-muted-foreground">Completed</span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {groups.completed.length}
                      </span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                          showCompleted && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                  {showCompleted && groups.completed.map((t) => renderTaskItem(t))}
                </React.Fragment>
              )}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  )
}

export default TodaysTasks
