"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskItem } from "@/components/tasks/task-item";
import type { Task } from "@/types/task";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {creating ? (
        <TaskForm mode="create" onDone={() => setCreating(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="self-start">
          <Plus />
          New task
        </Button>
      )}

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No tasks match this filter.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
