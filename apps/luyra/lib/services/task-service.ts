import "server-only";
import { Errors } from "@/lib/errors";
import {
  createTask,
  deleteTask,
  findTasksByUser,
  updateTask,
} from "@/lib/repositories/task-repository";
import type { CreateTaskInput, TaskFilters, UpdateTaskInput } from "@/lib/validation/task";
import type { Task } from "@/types/task";

export async function listTasks(userId: string, filters: TaskFilters): Promise<Task[]> {
  return findTasksByUser(userId, filters);
}

export async function addTask(userId: string, input: CreateTaskInput): Promise<Task> {
  return createTask(userId, input);
}

export async function editTask(userId: string, id: string, input: UpdateTaskInput): Promise<Task> {
  const task = await updateTask(id, userId, input);
  if (!task) throw Errors.notFound("Task");
  return task;
}

export async function removeTask(userId: string, id: string): Promise<void> {
  const deleted = await deleteTask(id, userId);
  if (!deleted) throw Errors.notFound("Task");
}
