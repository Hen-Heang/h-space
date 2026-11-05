"use client"

import { useState, useEffect } from "react"
import { CalendarClock, Trash2, Loader2 } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/useMobile"
import type { Task } from "@/lib/tasks"
import { DEFAULT_TASK_COLOR } from "@/lib/tasks"
import { bumpEndAfterStart, hhmmToMinutes } from "@/lib/calendar"
import {
  NO_GOAL,
  TaskFormFields,
  calcDurationMinutes,
  type TaskFormGoalOption,
} from "./TaskFormFields"
import type { TaskRangePayload } from "./AddTaskDialog"

interface EditTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  onUpdateTask: (
    taskId: string,
    description: string,
    date: Date,
    time?: string,
    range?: TaskRangePayload & { start_date?: Date | null; end_date?: Date | null },
  ) => void | Promise<void>
  onDeleteTask: (taskId: string) => void
  task: Task | null
  /** Goal options for the "Goal" field. Omit to hide it (embedded-in-goal calendars). */
  goals?: TaskFormGoalOption[]
}

export function EditTaskDialog({
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  task,
  goals,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [taskTime, setTaskTime] = useState("09:00")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [dailyStart, setDailyStart] = useState<string>("09:00")
  const [dailyEnd, setDailyEnd] = useState<string>("10:00")
  const [isAnytime, setIsAnytime] = useState<boolean>(false)
  const [completed, setCompleted] = useState<boolean>(false)
  const [color, setColor] = useState<string>(DEFAULT_TASK_COLOR)
  const [goalId, setGoalId] = useState<string>(NO_GOAL)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const isMobile = useIsMobile()

  const isSameDayTask = startDate.toDateString() === endDate.toDateString()

  const handleStartTimeChange = (value: string) => {
    const v = value || "09:00"
    setDailyStart(v)
    setTimeError(null)
    if (isSameDayTask) setDailyEnd((prev) => bumpEndAfterStart(v, prev))
  }

  const handleEndTimeChange = (value: string) => {
    const v = value || dailyEnd
    if (isSameDayTask && hhmmToMinutes(v) < hhmmToMinutes(dailyStart)) {
      setTimeError("End time cannot be before start time on the same day.")
      return
    }
    setTimeError(null)
    setDailyEnd(v)
  }

  const fixDailyEndForRange = (start: Date, end: Date) => {
    if (
      start.toDateString() !== end.toDateString() &&
      hhmmToMinutes(dailyEnd) < hhmmToMinutes(dailyStart)
    ) {
      setDailyEnd("23:59")
    }
  }

  const handleStartDateChange = (d: Date) => {
    setStartDate(d)
    if (d > endDate) setEndDate(d)
    else fixDailyEndForRange(d, endDate)
    setSelectedDate(d)
    setTimeError(null)
  }

  const handleEndDateChange = (d: Date) => {
    const next = d < startDate ? startDate : d
    setEndDate(next)
    fixDailyEndForRange(startDate, next)
    setTimeError(null)
  }

  useEffect(() => {
    if (task) {
      setTaskDescription(task.description.replace(/🔴\s*/, ""))
      setSelectedDate(new Date(task.start_date))
      setTitle(task.title || "")
      if (task.start_date) setStartDate(new Date(task.start_date))
      if (task.end_date) setEndDate(new Date(task.end_date))

      const hasTime = !!task.daily_start_time
      setIsAnytime(!hasTime || !!task.is_anytime)

      const startTime = hasTime ? task.daily_start_time!.slice(0, 5) : "09:00"
      const endTime = task.daily_end_time ? task.daily_end_time.slice(0, 5) : "10:00"
      setDailyStart(startTime)
      setDailyEnd(endTime)
      setTaskTime(startTime)
      setTimeError(null)
      setCompleted(!!task.completed)
      setColor(task.color || DEFAULT_TASK_COLOR)
      setGoalId(task.goal_id || NO_GOAL)
      setSubmitAttempted(false)
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!task || !title.trim() || isSubmitting) return

    const description = taskDescription.trim()
    const combinedDateTime = new Date(selectedDate)
    const [hours, minutes] = (dailyStart || taskTime).split(":")
    combinedDateTime.setHours(parseInt(hours), parseInt(minutes))

    const finalStart = dailyStart || "09:00"
    const finalEnd = dailyEnd || finalStart
    const durationMinutes = isAnytime
      ? null
      : calcDurationMinutes(startDate, endDate, finalStart, finalEnd)

    const range = {
      title,
      start_date: startDate,
      end_date: endDate,
      daily_start_time: isAnytime ? undefined : finalStart,
      daily_end_time: isAnytime ? undefined : finalEnd,
      is_anytime: isAnytime,
      duration_minutes: durationMinutes,
      completed,
      color,
      goal_id: goals ? (goalId === NO_GOAL ? null : goalId) : undefined,
    }

    setIsSubmitting(true)
    try {
      await onUpdateTask(task.id, description, combinedDateTime, taskTime, range)
      onClose()
    } catch (error) {
      console.error("Failed to update task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (task) {
      onDeleteTask(task.id)
      onClose()
    }
  }

  if (!task) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 overflow-hidden flex flex-col",
          isMobile ? "h-[92dvh] rounded-t-3xl" : "w-full sm:max-w-[480px] lg:max-w-[600px]",
        )}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="flex-shrink-0 border-b border-border/60 px-4 sm:px-5 py-4 sm:py-5">
            <SheetTitle className="flex items-center gap-3 text-base sm:text-lg font-semibold text-foreground">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
              </div>
              Edit Task
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-4 sm:px-5 py-5 pb-10">
              <TaskFormFields
                formId="edit-task-form"
                onSubmit={handleSubmit}
                preventEnterSubmit
                title={title}
                onTitleChange={setTitle}
                titlePlaceholder="Short title"
                showTitleRequired={submitAttempted}
                description={taskDescription}
                onDescriptionChange={setTaskDescription}
                descriptionPlaceholder="Enter task description"
                descriptionMinRows={isMobile ? 3 : 5}
                goals={goals}
                goalId={goalId}
                onGoalIdChange={setGoalId}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                startDateMax={endDate}
                endDateMin={startDate}
                dailyStart={dailyStart}
                dailyEnd={dailyEnd}
                onStartTimeChange={handleStartTimeChange}
                onEndTimeChange={handleEndTimeChange}
                timeError={timeError}
                showDuration
                isAnytime={isAnytime}
                onAnytimeChange={(v) => {
                  setIsAnytime(v)
                  setTimeError(null)
                }}
                completed={completed}
                onCompletedChange={setCompleted}
                color={color}
                onColorChange={setColor}
              />
            </div>
          </div>

          <div className="flex-shrink-0 p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-border/60 space-y-2.5">
            <Button
              type="submit"
              form="edit-task-form"
              disabled={isSubmitting || !!timeError}
              className="w-full h-11"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Update Task"
              )}
            </Button>
            <div className="flex gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-10">
                Cancel
              </Button>
              {/* One confirm only: onDeleteTask opens the calendar's
                  DeleteConfirmDialog, and the delete toast offers Undo. A
                  second "Are you sure?" here asked twice. */}
              <Button
                type="button"
                variant="destructive"
                className="flex-1 h-10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
