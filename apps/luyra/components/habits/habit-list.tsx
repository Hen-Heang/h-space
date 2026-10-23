"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createHabit } from "@/lib/api/habits";
import type { HabitCategory, HabitWithStats } from "@/types/habit";

import { CreateHabitForm } from "./create-habit-form";
import { HabitCard } from "./habit-card";

export function HabitList({ habits }: { habits: HabitWithStats[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreate(input: { label: string; category: HabitCategory; identityStatement?: string }) {
    await createHabit(input);
    router.refresh();
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {creating ? (
        <CreateHabitForm onCreate={handleCreate} onClose={() => setCreating(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="self-start">
          <Plus />
          New habit
        </Button>
      )}

      {habits.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/30 px-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles size={24} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No habits yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Start one to begin building a streak.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}
    </div>
  );
}
