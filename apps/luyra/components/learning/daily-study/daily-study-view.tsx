"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrCreateTodayPlan, runActivityAction, updatePlanNotes } from "@/lib/api/learning";
import { calculateDailyProgress, MODE_LABELS } from "@/lib/daily-study-plan";
import type { DailyStudyPlan } from "@/types/learning";
import { ActivityList } from "./activity-list";
import { ContentSections } from "./content-sections";
import { ReflectionForm } from "./reflection-form";

export function DailyStudyView() {
  const [plan, setPlan] = useState<DailyStudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await getOrCreateTodayPlan());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load today's study plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function handleActivityAction(activityId: string, action: "start" | "complete" | "skip") {
    if (!plan) return;
    const updated = await runActivityAction(plan.id, { activityId, action });
    setPlan(updated);
  }

  async function handleSaveNotes(input: { reflection?: string; missionResult?: string }) {
    if (!plan) return;
    const updated = await updatePlanNotes(plan.id, input);
    setPlan(updated);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading today&apos;s plan…</p>;
  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (!plan) return null;

  const progress = calculateDailyProgress(plan.activities);
  const today = new Date(`${plan.studyDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {today} · {MODE_LABELS[plan.mode]}
        </p>
        <h2 className="mt-1 text-xl font-semibold">{plan.topicLabel}</h2>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress.percentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {progress.completedCount}/{plan.activities.length} activities · {progress.focusedMinutes} of {progress.plannedMinutes} min
          focused
        </p>
      </div>

      <ActivityList activities={plan.activities} onAction={handleActivityAction} />
      <ContentSections content={plan.content} />
      <ReflectionForm plan={plan} onSave={handleSaveNotes} />
    </div>
  );
}
