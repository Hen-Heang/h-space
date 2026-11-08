"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "motion/react"
import { ArrowLeft, Flame } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CompletionCelebration } from "@/components/ui/completion-celebration"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckinCalendar } from "@/components/habits/CheckinCalendar"
import { EditHabitDialog } from "@/components/habits/EditHabitDialog"
import { MilestoneBadge } from "@/components/habits/MilestoneBadge"
import { CATEGORY_LABELS } from "@/components/habits/categoryMeta"
import { MILESTONE_LABELS } from "@/lib/milestones"
import { containerVariants, itemVariants } from "@/lib/motion"
import { useHabitCheckins, useHabits, toCheckinDate } from "@/hooks/useHabits"
import { useSessionTimer } from "@/hooks/useSessionTimer"

function HabitDetailLoadingState() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

export default function HabitDetailPage() {
  useSessionTimer("habits")
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [celebrate, setCelebrate] = useState(false)

  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    updateHabit,
    deleteHabit,
  } = useHabits()
  const habit = habits.find((h) => h.id === params.id) ?? null

  const {
    checkins,
    currentStreak,
    longestStreak,
    consistencyPercent,
    milestone,
    nextMilestone,
    loading: checkinsLoading,
    error: checkinsError,
    toggleCheckin,
  } = useHabitCheckins(habit?.id ?? null, habit?.startedAt)

  if (habitsLoading || (habit && checkinsLoading)) return <HabitDetailLoadingState />

  const error = habitsError || checkinsError
  if (error || !habit) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <ErrorBanner>{error || "Habit not found."}</ErrorBanner>
      </div>
    )
  }

  const handleToggle = async (date: string) => {
    const wasCompleted = checkins.some((c) => c.date === date && c.completed)
    await toggleCheckin(date)
    if (!wasCompleted && date === toCheckinDate()) setCelebrate(true)
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-xl space-y-5 pb-12"
    >
      <CompletionCelebration
        show={celebrate}
        onDone={() => setCelebrate(false)}
        subtitle="Checked in"
      />

      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/growth/habits">
            <ArrowLeft size={16} />
            Habits
          </Link>
        </Button>
        <EditHabitDialog
          habit={habit}
          onUpdate={(data) => updateHabit(habit.id, data)}
          onDelete={async () => {
            await deleteHabit(habit.id)
            router.push("/growth/habits")
          }}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <p className="text-sm font-medium text-muted-foreground">
          {CATEGORY_LABELS[habit.category]}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-[1.75rem]">
          {habit.label}
        </h1>
        {habit.identityStatement && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            &ldquo;{habit.identityStatement}&rdquo;
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground">
            <Flame size={14} className="text-orange-500" />
            {currentStreak}d streak
          </div>
          <div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            Best {longestStreak}d
          </div>
          <div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            {consistencyPercent}% consistent
          </div>
          <MilestoneBadge phase={milestone} />
        </div>

        {nextMilestone && (
          <p className="mt-4 text-xs text-muted-foreground">
            {nextMilestone.daysRemaining} day{nextMilestone.daysRemaining === 1 ? "" : "s"} to{" "}
            <span className="font-semibold">{MILESTONE_LABELS[nextMilestone.phase]}</span>
          </p>
        )}
      </motion.div>

      <CheckinCalendar checkins={checkins} startedAt={habit.startedAt} onToggle={handleToggle} />
    </motion.div>
  )
}
