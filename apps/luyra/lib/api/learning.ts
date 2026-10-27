import { apiFetch } from "@/lib/api/client";
import type { ReviewRating } from "@/lib/srs";
import type {
  ActivityActionInput,
  CreateVocabCardInput,
  UpdateVocabCardInput,
} from "@/lib/validation/learning";
import type { DailyStudyMode, DailyStudyPlan, VocabCard } from "@/types/learning";

export function listVocabCards(): Promise<VocabCard[]> {
  return apiFetch<VocabCard[]>("/api/learning/vocab");
}

export function listDueVocabCards(): Promise<{ due: VocabCard[]; dueCount: number }> {
  return apiFetch<{ due: VocabCard[]; dueCount: number }>("/api/learning/vocab/due");
}

export function createVocabCard(input: CreateVocabCardInput): Promise<VocabCard> {
  return apiFetch<VocabCard>("/api/learning/vocab", { method: "POST", body: JSON.stringify(input) });
}

export function updateVocabCard(id: string, input: UpdateVocabCardInput): Promise<VocabCard> {
  return apiFetch<VocabCard>(`/api/learning/vocab/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteVocabCard(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/learning/vocab/${id}`, { method: "DELETE" });
}

export function rateVocabCard(id: string, rating: ReviewRating): Promise<VocabCard> {
  return apiFetch<VocabCard>(`/api/learning/vocab/${id}/rate`, { method: "POST", body: JSON.stringify({ rating }) });
}

export function getOrCreateTodayPlan(mode: DailyStudyMode = "normal"): Promise<DailyStudyPlan> {
  return apiFetch<DailyStudyPlan>(`/api/learning/daily-study-plan?mode=${mode}`);
}

export function runActivityAction(planId: string, action: ActivityActionInput): Promise<DailyStudyPlan> {
  return apiFetch<DailyStudyPlan>("/api/learning/daily-study-plan", {
    method: "PATCH",
    body: JSON.stringify({ planId, activityAction: action }),
  });
}

export function updatePlanNotes(
  planId: string,
  input: { reflection?: string; missionResult?: string }
): Promise<DailyStudyPlan> {
  return apiFetch<DailyStudyPlan>("/api/learning/daily-study-plan", {
    method: "PATCH",
    body: JSON.stringify({ planId, ...input }),
  });
}
