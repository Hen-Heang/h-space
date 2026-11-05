"use client"

import { format, isValid } from "date-fns"
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
  Tag,
  ChevronLeft,
  AlignLeft,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/tasks"
import { getTaskColor } from "@/lib/tasks"
import { formatTaskDateRange, formatTaskTimeRange } from "@/lib/calendar"

interface TaskDetailsPanelProps {
  selectedTask: Task | null
  onToggleTaskCompletion: (taskId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  goalTitle: string
  onClose?: () => void
}

export function TaskDetailsPanel({
  selectedTask,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  goalTitle,
  onClose,
}: TaskDetailsPanelProps) {
  if (!selectedTask) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/60">
          <AlignLeft className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/60">No task selected</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a task to view its details</p>
        </div>
      </div>
    )
  }

  const hasTime = !!(selectedTask.is_anytime || selectedTask.daily_start_time)
  const createdAt = selectedTask.created_at ? new Date(selectedTask.created_at) : null
  const hasDescription = selectedTask.description && selectedTask.description !== selectedTask.title
  const taskColor = getTaskColor(selectedTask)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background/40">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-primary"
            onClick={onClose}
            aria-label="Close task details"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="mb-1 text-xs font-medium leading-none text-muted-foreground">Task</span>
          <span className="truncate text-sm font-semibold leading-none tracking-tight text-foreground">
            {goalTitle}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-primary"
            onClick={() => onEditTask(selectedTask)}
            title="Edit task"
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeleteTask(selectedTask.id)}
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTask.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-1.5 h-9 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: taskColor }}
              />
              <button
                onClick={() => onToggleTaskCompletion(selectedTask.id)}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 transition-colors duration-200",
                  selectedTask.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-primary/40 bg-background hover:border-primary",
                )}
                title={selectedTask.completed ? "Mark incomplete" : "Mark complete"}
                aria-label={selectedTask.completed ? "Mark incomplete" : "Mark complete"}
                aria-pressed={!!selectedTask.completed}
              >
                {selectedTask.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5 opacity-40" />
                )}
              </button>
              {/* h2: the shell header owns the page's only h1. */}
              <h2
                className={cn(
                  "flex-1 break-words text-2xl font-semibold leading-tight tracking-tight text-foreground transition-colors duration-300 sm:text-[1.75rem]",
                  selectedTask.completed && "line-through opacity-40",
                )}
              >
                {selectedTask.title || "Untitled task"}
              </h2>
            </div>

            <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/60 bg-card/50">
              <PropertyRow label="Status">
                <button
                  onClick={() => onToggleTaskCompletion(selectedTask.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200",
                    selectedTask.completed
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                >
                  {selectedTask.completed ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> In progress
                    </>
                  )}
                </button>
              </PropertyRow>

              <PropertyRow label="Date">
                <span className="flex items-center gap-2.5 text-sm font-medium tracking-tight text-foreground/90">
                  <span className="rounded-lg bg-primary/10 p-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </span>
                  {formatTaskDateRange(selectedTask.start_date, selectedTask.end_date)}
                </span>
              </PropertyRow>

              {hasTime && (
                <PropertyRow label="Time">
                  <span className="flex items-center gap-2.5 text-sm font-medium tracking-tight text-foreground/90">
                    <span className="rounded-lg bg-primary/10 p-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                    </span>
                    {formatTaskTimeRange(
                      selectedTask.daily_start_time,
                      selectedTask.daily_end_time,
                      selectedTask.is_anytime,
                    )}
                  </span>
                </PropertyRow>
              )}

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <PropertyRow label="Tags">
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </PropertyRow>
              )}

              <PropertyRow label="Color">
                <span className="flex items-center gap-2.5 text-sm font-medium tracking-tight text-foreground/90">
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{
                      backgroundColor: taskColor,
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                    }}
                  />
                  <span className="font-mono text-xs uppercase">{taskColor}</span>
                </span>
              </PropertyRow>

              {createdAt && isValid(createdAt) && (
                <PropertyRow label="Created">
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </PropertyRow>
              )}
            </div>

            {hasDescription && (
              <div className="space-y-4">
                <h2 className="px-1 text-xs font-medium text-muted-foreground">Description</h2>
                <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-card/50 p-4 text-sm leading-6 text-foreground/90 sm:p-5">
                  {selectedTask.description}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-border/60 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <button
          onClick={() => onToggleTaskCompletion(selectedTask.id)}
          className={cn(
            "flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-200",
            selectedTask.completed
              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <CheckCircle2 className="h-5 w-5" />
          {selectedTask.completed ? "Completed" : "Mark complete"}
        </button>
        <Button
          variant="ghost"
          className="h-11 gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => onEditTask(selectedTask)}
        >
          <Pencil className="h-4 w-4" />
          Edit task
        </Button>
      </div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[42px] items-center px-4 transition-colors hover:bg-muted/30">
      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex-1 py-2">{children}</div>
    </div>
  )
}
