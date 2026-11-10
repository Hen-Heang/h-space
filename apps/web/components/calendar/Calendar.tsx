"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addDays, addMonths } from "date-fns"
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"

import { useQuery } from "@tanstack/react-query"

import { useIsMobile } from "@/hooks/useMobile"
import { useCalendarTasks } from "@/hooks/useCalendarTasks"
import { goalsQueryKey } from "@/hooks/useGoals"
import { getApiErrorMessage, goalsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { Task } from "@/lib/tasks"
import { filterTasksByDate, getTaskAnchorDate } from "@/lib/calendar"
import { getAvailableFocusWindows } from "@/lib/free-time"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CompletionCelebration } from "@/components/ui/completion-celebration"
import { DeleteConfirmDialog } from "@/components/goals/DeleteConfirmDialog"
import { AvailableFocusWindows } from "./AvailableFocusWindows"

import { CalendarViewSwitcher, type CalendarView } from "./CalendarViewSwitcher"
import { HolidayDetailsDialog } from "./HolidayDetailsDialog"
import { WeekTimeGrid } from "./WeekTimeGrid"
import { MonthView } from "./MonthView"
import { TaskList } from "./TaskList"
import { TaskDetailsPanel } from "./TaskDetailsPanel"
import { TaskDetailsSheet } from "./TaskDetailsSheet"
import { AddTaskDialog, type TaskRangePayload } from "./AddTaskDialog"
import { EditTaskDialog } from "./EditTaskDialog"

interface CalendarProps {
  /** Goal id to scope tasks to. Omit for the standalone personal calendar. */
  goalId?: string
  goalTitle?: string
  /** Goal date window — used to validate task dates on creation. */
  goalStartDate?: Date
  goalTargetDate?: Date
  /** Deep-link: when set, auto-open this task once the list has loaded (?task=). */
  initialTaskId?: string | null
  /** Fill the route workspace; embedded goal calendars keep their card frame. */
  fullBleed?: boolean
}

const toIso = (d?: Date | null): string | undefined =>
  d && !isNaN(d.getTime()) ? d.toISOString() : undefined

const CALENDAR_VIEW_STORAGE_KEY = "hengo:calendar-view"

function getInitialCalendarView(): CalendarView {
  if (typeof window === "undefined") return "week"
  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)
  } catch {
    // Use the responsive default when storage is unavailable.
  }
  const saved = stored === "day" || stored === "week" || stored === "month" ? stored : null
  if (window.innerWidth < 1024) return saved === "month" ? "month" : "day"
  return saved ?? "week"
}

export function Calendar({
  goalId,
  goalTitle,
  goalStartDate,
  goalTargetDate,
  initialTaskId,
  fullBleed = false,
}: CalendarProps) {
  const isMobile = useIsMobile()
  const { tasks, isLoading, error: tasksError, create, update, remove } = useCalendarTasks(goalId)

  // Goal options for the "Goal" field on task create/edit — only relevant to
  // the unscoped, top-level calendar (embedded-in-goal calendars already
  // imply their one goal, so `goals` stays undefined there and the field
  // hides itself — see TaskFormFields). Shares its cache with useGoals /
  // useTodaysTasks via the same query key.
  const userId = getUserId()
  const { data: allGoals = [] } = useQuery({
    queryKey: goalsQueryKey(userId),
    queryFn: () => goalsApi.list(),
    enabled: !goalId && userId != null,
  })
  const availableGoals = useMemo(
    () => allGoals.map((g) => ({ id: g.id, title: g.title })),
    [allGoals],
  )
  const goalTitleById = useMemo(() => {
    const map: Record<string, string> = {}
    availableGoals.forEach((g) => {
      map[g.id] = g.title
    })
    return map
  }, [availableGoals])

  const [view, setView] = useState<CalendarView>(getInitialCalendarView)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false) // mobile sheet
  const [holidayDetailsDate, setHolidayDetailsDate] = useState<Date | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [slotTime, setSlotTime] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  // Week view is desktop-only; derive a phone-safe view without an effect so a
  // desktop→mobile resize that left `view` on "week" falls back to "day".
  const effectiveView: CalendarView = isMobile && view === "week" ? "day" : view

  const getTasksForDate = useCallback((date: Date) => filterTasksByDate(tasks, date), [tasks])

  const currentDateTasks = useMemo(
    () => getTasksForDate(selectedDate),
    [getTasksForDate, selectedDate],
  )

  // ── Free time (Phase 8): open windows between the day's tasks.
  const focusWindows = useMemo(
    () => getAvailableFocusWindows({ tasks: currentDateTasks }),
    [currentDateTasks],
  )

  // ── Navigation ──────────────────────────────────────────────────────────
  const handleViewChange = (nextView: CalendarView) => {
    setView(nextView)
    try {
      window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, nextView)
    } catch {
      // A blocked storage API should not make the calendar unusable.
    }
  }

  const handleCalendarNavigate = (dir: "prev" | "next" | "today") => {
    const base = selectedDate
    let next: Date
    if (dir === "today") next = new Date()
    else {
      const delta = dir === "next" ? 1 : -1
      next =
        effectiveView === "day"
          ? addDays(base, delta)
          : effectiveView === "week"
            ? addDays(base, delta * 7)
            : addMonths(base, delta)
    }
    setSelectedTask(null)
    setSelectedDate(next)
  }

  const handleNavigateTask = useCallback(
    (dir: "prev" | "next") => {
      if (currentDateTasks.length === 0) return
      setSelectedTaskIndex((idx) => {
        const nextIdx =
          dir === "next" ? Math.min(idx + 1, currentDateTasks.length - 1) : Math.max(idx - 1, 0)
        setSelectedTask(currentDateTasks[nextIdx] ?? null)
        return nextIdx
      })
    },
    [currentDateTasks],
  )

  // Keyboard left/right navigates tasks (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "ArrowLeft") handleNavigateTask("prev")
      else if (e.key === "ArrowRight") handleNavigateTask("next")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleNavigateTask])

  // ── Selection ───────────────────────────────────────────────────────────
  const handleOpenTaskDetails = (task?: Task) => {
    if (task) {
      setSelectedTask(task)
      const taskDate = getTaskAnchorDate(task)
      setSelectedDate(taskDate)
      const list = getTasksForDate(taskDate)
      const idx = list.findIndex((t) => t.id === task.id)
      setSelectedTaskIndex(idx >= 0 ? idx : 0)
    }
    if (isMobile) setIsDetailsOpen(true)
  }

  // Deep-link (?task=): once tasks load, open the requested task a single time.
  // Deferred via microtask so the open isn't a synchronous cascade in the effect.
  const openedTaskRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialTaskId || isLoading) return
    if (openedTaskRef.current === initialTaskId) return
    const task = tasks.find((t) => t.id === initialTaskId)
    if (!task) return
    openedTaskRef.current = initialTaskId
    queueMicrotask(() => {
      const anchor = getTaskAnchorDate(task)
      setSelectedDate(anchor)
      setSelectedTask(task)
      const idx = filterTasksByDate(tasks, anchor).findIndex((t) => t.id === task.id)
      setSelectedTaskIndex(idx >= 0 ? idx : 0)
      if (isMobile) setIsDetailsOpen(true)
    })
  }, [initialTaskId, isLoading, tasks, isMobile])

  const handleSlotClick = (day: Date, time: string) => {
    setSelectedTask(null)
    setSelectedDate(day)
    setSlotTime(time)
    setIsAddOpen(true)
  }

  const handleGridDateSelect = (day: Date) => {
    setSelectedTask(null)
    setSelectedDate(day)
    handleViewChange("day")
  }

  const handleJumpToDate = (date: Date) => {
    setSelectedTask(null)
    setSelectedDate(date)
  }

  const handleMonthQuickAdd = (day: Date) => {
    setSelectedTask(null)
    setSelectedDate(day)
    setSlotTime(null)
    setIsAddOpen(true)
  }

  const openAddDialog = () => {
    setSlotTime(null)
    setIsAddOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditOpen(true)
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  const handleAddTask = async (
    description: string,
    date: Date,
    _time?: string,
    range?: TaskRangePayload,
  ) => {
    try {
      await create({
        title: range?.title?.trim() || "Untitled task",
        description,
        start_date: toIso(range?.start_date ?? date)!,
        end_date: toIso(range?.end_date ?? date)!,
        daily_start_time: range?.is_anytime ? null : (range?.daily_start_time ?? null),
        daily_end_time: range?.is_anytime ? null : (range?.daily_end_time ?? null),
        is_anytime: range?.is_anytime ?? false,
        duration_minutes: range?.duration_minutes ?? null,
        color: range?.color ?? null,
        completed: range?.completed ?? false,
        goal_id: range?.goal_id ?? null,
      })
      toast.success("Task created")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create task"))
      throw err
    }
  }

  const handleUpdateTask = async (
    taskId: string,
    description: string,
    date: Date,
    _time?: string,
    range?: TaskRangePayload & { start_date?: Date | null; end_date?: Date | null },
  ) => {
    try {
      const updated = await update(taskId, {
        title: range?.title,
        description,
        start_date: toIso(range?.start_date ?? date),
        end_date: toIso(range?.end_date ?? date),
        daily_start_time: range?.is_anytime ? null : range?.daily_start_time,
        daily_end_time: range?.is_anytime ? null : range?.daily_end_time,
        is_anytime: range?.is_anytime,
        duration_minutes: range?.duration_minutes,
        color: range?.color,
        completed: range?.completed,
        goal_id: range?.goal_id,
      })
      if (selectedTask?.id === taskId) setSelectedTask(updated)
      toast.success("Task updated")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update task"))
      throw err
    }
  }

  const handleToggleTaskCompletion = async (taskId: string) => {
    const task =
      tasks.find((t) => t.id === taskId) ?? (selectedTask?.id === taskId ? selectedTask : null)
    if (!task) return
    const nextCompleted = !task.completed
    // Confetti when completing; stay quiet when re-opening a task.
    if (nextCompleted) setCelebrate(true)
    if (selectedTask?.id === taskId) setSelectedTask({ ...selectedTask, completed: nextCompleted })
    try {
      await update(taskId, { completed: nextCompleted })
    } catch (err) {
      if (selectedTask?.id === taskId)
        setSelectedTask({ ...selectedTask, completed: task.completed })
      toast.error(getApiErrorMessage(err, "Couldn't update the task"))
    }
  }

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setTaskToDelete(task)
      setIsConfirmDeleteOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return
    const deleted = taskToDelete
    setIsConfirmDeleteOpen(false)
    setTaskToDelete(null)
    if (selectedTask?.id === deleted.id) setSelectedTask(null)
    setIsDetailsOpen(false)
    try {
      await remove(deleted.id)
      toast.success(`"${deleted.title || "Task"}" deleted`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await create({
                title: deleted.title || "Untitled task",
                description: deleted.description,
                start_date: deleted.start_date,
                end_date: deleted.end_date,
                daily_start_time: deleted.daily_start_time ?? null,
                daily_end_time: deleted.daily_end_time ?? null,
                is_anytime: deleted.is_anytime ?? false,
                duration_minutes: deleted.duration_minutes ?? null,
                color: deleted.color ?? null,
                completed: deleted.completed,
                tags: deleted.tags,
                goal_id: deleted.goal_id ?? null,
              })
              toast.success("Task restored")
            } catch (err) {
              toast.error(getApiErrorMessage(err, "Couldn't restore the task"))
            }
          },
        },
      })
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete task"))
    }
  }

  // Unscoped now mixes personal tasks with every goal's tasks (see
  // useCalendarTasks), so the header can no longer claim "Personal tasks" —
  // that label survives only per-task, in `taskScopeLabel` below.
  const scopeTitle = goalTitle || (goalId ? "Goal tasks" : "Calendar")

  // Per-task label for the details panel/sheet: which goal (if any) a given
  // task belongs to. Embedded-in-goal calendars keep the single static
  // `scopeTitle` — every task there is that one goal's, so there's nothing
  // to disambiguate.
  const taskScopeLabel = (t: Task | null): string => {
    if (!t || goalId) return scopeTitle
    return t.goal_id ? (goalTitleById[t.goal_id] ?? "Goal task") : "Personal task"
  }

  // ── Sidebar (desktop) ─────────────────────────────────────────────────────
  const sidebar = (
    <div className="flex h-full flex-col border-r border-border/60 bg-card/40">
      <div
        className={cn(
          "flex items-center border-b border-border/60 px-4 py-3",
          fullBleed ? "min-h-16 justify-start" : "justify-between",
        )}
      >
        {fullBleed ? (
          <Button size="sm" className="h-10 gap-2 rounded-xl px-4 text-sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Create task
          </Button>
        ) : (
          <>
            <span title={scopeTitle} className="truncate text-sm font-semibold text-foreground">
              {scopeTitle}
            </span>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              onClick={openAddDialog}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <TaskList
          selectedDate={selectedDate}
          tasks={currentDateTasks}
          onTaskClick={handleOpenTaskDetails}
          onToggleTaskCompletion={handleToggleTaskCompletion}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      </div>
      {currentDateTasks.length > 0 && (
        <div className="flex items-center justify-center gap-6 border-t border-border/60 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => handleNavigateTask("prev")}
            aria-label="Previous task"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {String(selectedTaskIndex + 1).padStart(2, "0")} /{" "}
            {String(currentDateTasks.length).padStart(2, "0")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => handleNavigateTask("next")}
            aria-label="Next task"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )

  const viewBody = (
    <>
      <div className="shrink-0 border-b border-border/60 bg-card/40">
        <CalendarViewSwitcher
          view={effectiveView}
          onViewChange={handleViewChange}
          selectedDate={selectedDate}
          onNavigate={handleCalendarNavigate}
          onJumpToDate={handleJumpToDate}
          views={isMobile ? ["day", "month"] : ["day", "week", "month"]}
        />
      </div>
      {tasksError && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:px-4"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Hengo tasks could not be loaded. Refresh to try again.</span>
        </div>
      )}
      {!goalId && !tasksError && (
        <AvailableFocusWindows date={selectedDate} windows={focusWindows} />
      )}
      <div className="min-h-0 flex-1">
        {effectiveView === "month" ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-[3] overflow-hidden">
              <MonthView
                currentMonth={selectedDate}
                selectedDate={selectedDate}
                onDateChange={(d) => {
                  setSelectedTask(null)
                  setSelectedDate(d)
                }}
                getTasksForDate={getTasksForDate}
                onTaskClick={handleOpenTaskDetails}
                onHolidayClick={setHolidayDetailsDate}
                onQuickAdd={handleMonthQuickAdd}
              />
            </div>
            {isMobile && (
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/60 no-scrollbar">
                <TaskList
                  selectedDate={selectedDate}
                  tasks={currentDateTasks}
                  onTaskClick={handleOpenTaskDetails}
                  onToggleTaskCompletion={handleToggleTaskCompletion}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              </div>
            )}
          </div>
        ) : (
          <WeekTimeGrid
            mode={effectiveView === "week" ? "week" : "day"}
            selectedDate={selectedDate}
            getTasksForDate={getTasksForDate}
            onTaskClick={handleOpenTaskDetails}
            onSlotClick={handleSlotClick}
            onDateSelect={handleGridDateSelect}
            onHolidayClick={setHolidayDetailsDate}
            hourHeight={isMobile ? 88 : 64}
          />
        )}
      </div>
    </>
  )

  return (
    <motion.div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        fullBleed ? "bg-background" : "rounded-xl border border-border/60 bg-background/50",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {isLoading && tasks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading tasks…
        </div>
      ) : isMobile ? (
        <div className="flex h-full min-h-0 flex-col">
          {viewBody}
          {/* The page's floating button owns the bottom-right corner, just
              above the bottom nav — the same spot as Finance's quick-add. The
              shell has no floating AI launcher (Ask Hengo is in the top bar). */}
          <button
            type="button"
            onClick={openAddDialog}
            className="fixed right-4 bottom-[calc(var(--shell-bottom-nav-h,0px)+max(0.75rem,calc(env(safe-area-inset-bottom)-var(--shell-bottom-nav-h,0px))))] z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
            aria-label="Add task"
          >
            <Plus aria-hidden="true" className="size-6" />
          </button>
        </div>
      ) : (
        <div
          className="grid h-full min-h-0"
          style={{
            gridTemplateColumns: fullBleed
              ? "clamp(260px, 20vw, 300px) minmax(0, 1fr)"
              : "clamp(260px, 22vw, 320px) minmax(0, 1fr)",
          }}
        >
          {sidebar}
          <div className="relative h-full min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {selectedTask ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                >
                  <TaskDetailsPanel
                    selectedTask={selectedTask}
                    onToggleTaskCompletion={handleToggleTaskCompletion}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    goalTitle={taskScopeLabel(selectedTask)}
                    onClose={() => setSelectedTask(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex h-full min-h-0 flex-col"
                >
                  {viewBody}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AddTaskDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddTask={handleAddTask}
        defaultDate={selectedDate}
        defaultTime={slotTime}
        goalStartDate={goalStartDate}
        goalTargetDate={goalTargetDate}
        goals={goalId ? undefined : availableGoals}
      />

      <EditTaskDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        task={editingTask}
        goals={goalId ? undefined : availableGoals}
      />

      <HolidayDetailsDialog
        date={holidayDetailsDate}
        isOpen={holidayDetailsDate !== null}
        onClose={() => setHolidayDetailsDate(null)}
      />

      {isMobile && (
        <TaskDetailsSheet
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          selectedTask={selectedTask}
          onToggleTaskCompletion={handleToggleTaskCompletion}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          goalTitle={taskScopeLabel(selectedTask)}
        />
      )}

      <DeleteConfirmDialog
        isOpen={isConfirmDeleteOpen}
        isDeleting={null}
        onCancel={() => {
          setIsConfirmDeleteOpen(false)
          setTaskToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        goalTitle={taskToDelete?.title || "this task"}
        itemType="task"
      />

      <CompletionCelebration show={celebrate} onDone={() => setCelebrate(false)} />
    </motion.div>
  )
}
