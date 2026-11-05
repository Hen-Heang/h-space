"use client"

import { memo } from "react"
import { Check, Clock, Pencil, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/tasks"
import { getTaskColor } from "@/lib/tasks"
import { formatTaskTimeRange } from "@/lib/calendar"

interface ModernTaskItemProps {
  task: Task
  onClick?: (task: Task) => void
  onToggleCompletion: (taskId: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  compact?: boolean
}

export const ModernTaskItem = memo(function ModernTaskItem({
  task,
  onClick,
  onToggleCompletion,
  onEdit,
  onDelete,
  compact = false,
}: ModernTaskItemProps) {
  // The full title, wrapped to two lines by CSS. It used to be cut to 23
  // characters in JS before CSS truncation even got a say.
  const rawTitle = task.title || task.description || ""

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion(task.id)
  }

  const timeDisplay =
    task.is_anytime || task.daily_start_time
      ? formatTaskTimeRange(task.daily_start_time, task.daily_end_time, task.is_anytime)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg border transition-colors cursor-pointer overflow-hidden",
        task.completed
          ? "bg-muted/35 border-border/50 opacity-75"
          : "bg-card border-border/70 shadow-sm",
        compact ? "p-2" : "px-2.5 py-2",
      )}
      onClick={() => onClick?.(task)}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleToggle}
        // The 20px box stays; the after: layer grows the tap target to 44px
        // (apps/web/AGENTS.md: enlarge hit areas, not visuals).
        className={cn(
          "relative shrink-0 flex h-5 w-5 items-center justify-center rounded-lg border transition-colors after:absolute after:-inset-3 after:content-['']",
          task.completed ? "border-primary bg-primary shadow-sm" : "border-border bg-background",
        )}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        <AnimatePresence mode="wait">
          {task.completed && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-0.5">
        <span
          title={rawTitle}
          className={cn(
            "line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug",
            task.completed ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {rawTitle}
        </span>

        {timeDisplay && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-xs font-medium",
                task.completed
                  ? "border-muted-foreground/20 text-muted-foreground bg-transparent"
                  : "border-primary/20 text-primary bg-primary/5",
              )}
            >
              {!task.is_anytime && <Clock className="w-2.5 h-2.5 mr-1" />}
              {timeDisplay}
            </Badge>
          </div>
        )}
      </div>

      {!task.completed && (
        <div className="flex items-center gap-1 shrink-0">
          {/* icon-sm: 32px with a pointer, 44px on touch (Button's coarse-
              pointer sizing) — the old h-6 override pinned these to 24px. */}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full",
          task.completed ? "h-3.5 opacity-40" : "h-7",
        )}
        style={{ backgroundColor: getTaskColor(task) }}
      />
    </motion.div>
  )
})
