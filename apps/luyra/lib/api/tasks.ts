import { apiFetch } from "@/lib/api/client";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validation/task";
import type { Task } from "@/types/task";

export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiFetch<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/tasks/${id}`, { method: "DELETE" });
}
