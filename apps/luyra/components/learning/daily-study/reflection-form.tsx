"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DailyStudyPlan } from "@/types/learning";

export function ReflectionForm({
  plan,
  onSave,
}: {
  plan: DailyStudyPlan;
  onSave: (input: { reflection?: string; missionResult?: string }) => Promise<void>;
}) {
  const [reflection, setReflection] = useState(plan.reflection);
  const [missionResult, setMissionResult] = useState(plan.missionResult);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setPending(true);
    setSaved(false);
    try {
      await onSave({ reflection, missionResult });
      setSaved(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <label className="text-sm font-medium" htmlFor="mission-result">
          Mission result
        </label>
        <Textarea
          id="mission-result"
          value={missionResult}
          onChange={(e) => setMissionResult(e.target.value)}
          rows={2}
          placeholder="What happened when you tried today's real-world mission?"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="reflection">
          {plan.content.reflectionPrompt}
        </label>
        <Textarea id="reflection" value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} className="mt-1" />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-xs text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}
