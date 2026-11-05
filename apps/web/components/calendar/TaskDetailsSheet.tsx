"use client"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { Task } from "@/lib/tasks"
import { TaskDetailsPanel } from "./TaskDetailsPanel"

interface TaskDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedTask: Task | null
  onToggleTaskCompletion: (taskId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  goalTitle: string
}

/** Mobile bottom-sheet wrapper around the task details panel. */
export function TaskDetailsSheet({
  isOpen,
  onClose,
  selectedTask,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  goalTitle,
}: TaskDetailsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* The panel brings its own close button; the Sheet's default X sat on
          top of the panel's Delete button in the same corner. */}
      <SheetContent side="bottom" showCloseButton={false} className="h-[88dvh] rounded-t-3xl p-0">
        <SheetTitle className="sr-only">Task details</SheetTitle>
        <TaskDetailsPanel
          selectedTask={selectedTask}
          onToggleTaskCompletion={onToggleTaskCompletion}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          goalTitle={goalTitle}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}
