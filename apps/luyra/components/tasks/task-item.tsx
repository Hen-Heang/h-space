"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { deleteTask, updateTask } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/tasks/task-form";
import { cn, formatDueDate } from "@/lib/utils";
import type { Task } from "@/types/task";

const PRIORITY_VARIANT = {
  high: "destructive",
  medium: "warning",
  low: "outline",
} as const;

export function TaskItem({ task }: { task: Task }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const isDone = task.status === "done";

  async function toggleDone() {
    setPending(true);
    try {
      await updateTask(task.id, { status: isDone ? "todo" : "done" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteTask(task.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <div className="p-3">
        <TaskForm mode="edit" task={task} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const dueLabel = formatDueDate(task.dueDate);
  const isOverdue = dueLabel?.startsWith("Overdue");

  return (
    <div className="flex flex-col items-stretch gap-2 p-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-3">
      <div className="flex min-w-0 items-center gap-1 xs:gap-3">
        <button
          type="button"
          onClick={toggleDone}
          disabled={pending}
          aria-label={isDone ? "Reopen task" : "Mark task complete"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn("flex size-5 items-center justify-center rounded-full border", isDone ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
            {isDone && <Check className="size-3" />}
          </span>
        </button>
        <div className="min-w-0">
          <p className={cn("truncate text-sm", isDone && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          {task.description && (
            <p className="truncate text-xs text-muted-foreground">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 min-[520px]:shrink-0 min-[520px]:gap-2">
        {dueLabel && (
          <span className={isOverdue && !isDone ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {dueLabel}
          </span>
        )}
        {task.priority && <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>}

        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit task">
          <Pencil className="size-4" />
        </Button>

        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setConfirmingDelete(true)} aria-label="Delete task">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
