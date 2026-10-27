export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

// DTO shape returned by the API — camelCase, no database-specific fields.
// This is the contract the frontend depends on; it stays the same when the
// backend is later replaced by Spring Boot.
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
