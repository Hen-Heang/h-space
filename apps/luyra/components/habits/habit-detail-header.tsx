"use client";

import { useRouter } from "next/navigation";

import { deleteHabit, updateHabit } from "@/lib/api/habits";
import type { Habit, HabitCategory } from "@/types/habit";

import { CATEGORY_LABELS } from "./category-meta";
import { EditHabitDialog } from "./edit-habit-dialog";

export function HabitDetailHeader({ habit }: { habit: Habit }) {
  const router = useRouter();

  async function handleUpdate(data: { label: string; category: HabitCategory; identityStatement?: string | null }) {
    await updateHabit(habit.id, data);
    router.refresh();
  }

  async function handleDelete() {
    await deleteHabit(habit.id);
    router.push("/habits");
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{habit.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{CATEGORY_LABELS[habit.category]}</p>
        {habit.identityStatement && (
          <p className="mt-2 text-sm text-muted-foreground italic">&ldquo;{habit.identityStatement}&rdquo;</p>
        )}
      </div>
      <EditHabitDialog habit={habit} onUpdate={handleUpdate} onDelete={handleDelete} />
    </div>
  );
}
