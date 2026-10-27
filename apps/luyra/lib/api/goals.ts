import { apiFetch } from "@/lib/api/client";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goal";
import type { Goal } from "@/types/goal";

export function createGoal(input: CreateGoalInput): Promise<Goal> {
  return apiFetch<Goal>("/api/goals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/api/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/goals/${id}`, { method: "DELETE" });
}
