"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Flame } from "lucide-react";

import { removeCheckin, setCheckin } from "@/lib/api/habits";
import { toCheckinDate } from "@/lib/habits";
import { milestonePhase } from "@/lib/milestones";
import type { HabitWithStats } from "@/types/habit";

import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from "./category-meta";
import { MilestoneBadge } from "./milestone-badge";

export function HabitCard({ habit }: { habit: HabitWithStats }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const Icon = CATEGORY_ICONS[habit.category];

  async function toggleToday() {
    setPending(true);
    try {
      const today = toCheckinDate();
      if (habit.stats.doneToday) {
        await removeCheckin(habit.id, today);
      } else {
        await setCheckin(habit.id, today);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:bg-accent/50 sm:gap-4 sm:p-4">
      {/* Stretched link keeps the whole row useful for details. Interactive
          controls below render after it and stay clickable above the link. */}
      <Link href={`/habits/${habit.id}`} className="absolute inset-0" aria-label={habit.label} />

      <div
        className={`pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLORS[habit.category]}`}
      >
        <Icon size={19} strokeWidth={2} />
      </div>

      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{habit.label}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{CATEGORY_LABELS[habit.category]}</span>
          {habit.stats.currentStreak > 0 && (
            <span className="flex items-center gap-1 font-semibold">
              <Flame size={12} className="text-orange-500" />
              {habit.stats.currentStreak} day{habit.stats.currentStreak === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-none hidden shrink-0 sm:block">
        <MilestoneBadge phase={milestonePhase(habit.stats.daysActive)} />
      </div>

      <button
        type="button"
        onClick={toggleToday}
        disabled={pending}
        aria-label={habit.stats.doneToday ? `Undo today's check-in for ${habit.label}` : `Check in ${habit.label} for today`}
        title={habit.stats.doneToday ? "Done today" : "Check in today"}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-50"
      >
        {habit.stats.doneToday ? (
          <CheckCircle2 className="size-5 text-emerald-500" />
        ) : (
          <Circle className="size-5 text-muted-foreground/60" />
        )}
      </button>
    </div>
  );
}
