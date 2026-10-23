import { apiFetch } from "@/lib/api/client";
import type { CreateHabitInput, UpdateHabitInput } from "@/lib/validation/habit";
import type { Habit, HabitCheckIn } from "@/types/habit";

export function createHabit(input: CreateHabitInput): Promise<Habit> {
  return apiFetch<Habit>("/api/habits", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateHabit(id: string, input: UpdateHabitInput): Promise<Habit> {
  return apiFetch<Habit>(`/api/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteHabit(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/habits/${id}`, { method: "DELETE" });
}

export function getHabitCheckins(id: string): Promise<HabitCheckIn[]> {
  return apiFetch<HabitCheckIn[]>(`/api/habits/${id}/checkins`);
}

export function setCheckin(id: string, date: string): Promise<HabitCheckIn> {
  return apiFetch<HabitCheckIn>(`/api/habits/${id}/checkins/${date}`, { method: "PUT" });
}

export async function removeCheckin(id: string, date: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/habits/${id}/checkins/${date}`, { method: "DELETE" });
}
