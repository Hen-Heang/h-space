"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Goal } from "@/types/goal";

import { GoalCard } from "./goal-card";
import { GoalFormSheet } from "./goal-form-sheet";

export function GoalList({ goals }: { goals: Goal[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="self-start">
        <Plus />
        New goal
      </Button>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/30 px-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Target size={24} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No goals match this filter</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a goal to start tracking it.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <GoalFormSheet mode="create" open={creating} onOpenChange={setCreating} />
    </div>
  );
}
