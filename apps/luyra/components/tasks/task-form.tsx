"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task, TaskPriority } from "@/types/task";

const PRIORITIES: { label: string; value: TaskPriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export function TaskForm({
  mode,
  task,
  onDone,
}: {
  mode: "create" | "edit";
  task?: Task;
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority | "">(task?.priority ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

    try {
      if (mode === "create") {
        await createTask({
          title,
          description: description.trim() || undefined,
          priority: priority || undefined,
          dueDate: isoDueDate ?? undefined,
        });
      } else if (task) {
        await updateTask(task.id, {
          title,
          description: description.trim() === "" ? null : description.trim(),
          priority: priority || null,
          dueDate: isoDueDate,
        });
      }
      router.refresh();
      onDone();
    } catch {
      setError("Couldn't save the task. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <Input
        autoFocus
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
          className="h-11 min-w-0 rounded-md border border-input bg-transparent px-2 text-base sm:h-9 sm:text-sm"
        >
          <option value="">No priority</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-11 min-w-0 rounded-md border border-input bg-transparent px-2 text-base sm:h-9 sm:text-sm"
        />
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || title.trim().length === 0}>
          {mode === "create" ? "Add task" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
