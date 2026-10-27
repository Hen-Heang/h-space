import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getHabit, getHabitCheckins } from "@/lib/services/habit-service";
import { HabitCheckinsSection } from "@/components/habits/habit-checkins-section";
import { HabitDetailHeader } from "@/components/habits/habit-detail-header";
import { MilestoneBadge } from "@/components/habits/milestone-badge";
import { milestonePhase } from "@/lib/milestones";

export default async function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await ensureAppUser();

  let habit;
  let checkins;
  try {
    habit = await getHabit(appUser.id, id);
    checkins = await getHabitCheckins(appUser.id, id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <HabitDetailHeader habit={habit} />

      <div className="flex flex-wrap items-center gap-3">
        <MilestoneBadge phase={milestonePhase(habit.stats.daysActive)} />
        <span className="text-sm text-muted-foreground">
          {habit.stats.currentStreak} day streak · {habit.stats.longestStreak} longest ·{" "}
          {habit.stats.consistencyPercent}% consistency
        </span>
      </div>

      <HabitCheckinsSection habitId={habit.id} startedAt={habit.startedAt} checkins={checkins} />
    </div>
  );
}
