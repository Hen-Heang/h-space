"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { CheckCircle2, Plus } from "lucide-react"

import { GrowthTabs } from "@/components/growth/GrowthTabs"
import { CreateHabitForm } from "@/components/habits/CreateHabitForm"
import { HabitCard } from "@/components/habits/HabitCard"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { containerVariants, itemVariants } from "@/lib/motion"
import { useHabits, useHabitsDoneToday } from "@/hooks/useHabits"
import { useSessionTimer } from "@/hooks/useSessionTimer"

function TodayProgress({
  done,
  total,
  loading,
}: {
  done: number
  total: number
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-[3.75rem] w-full rounded-lg" />
  const allDone = total > 0 && done === total
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          {allDone && <CheckCircle2 size={16} className="text-emerald-500" aria-hidden="true" />}
          {allDone ? "All done for today" : "Today"}
        </p>
        <p className="tabular-nums text-muted-foreground">
          {done} of {total} done
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Habits done today"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function HabitsLoadingState() {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  )
}

export default function HabitsPage() {
  useSessionTimer("habits")
  const { activeHabits, loading, error, addHabit } = useHabits()
  const today = useHabitsDoneToday(activeHabits)
  const [showForm, setShowForm] = useState(false)

  if (loading) return <HabitsLoadingState />

  const shouldShowForm = activeHabits.length === 0 || showForm

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-xl space-y-4 pb-12"
    >
      <motion.div variants={itemVariants}>
        <BackLink href="/home" label="Home" mobileOnly />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GrowthTabs />
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Your habits</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Tap the circle to check in today. Missed a day? Tap it in the week row.
          </p>
        </div>
        {activeHabits.length > 0 && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="shrink-0"
          >
            <Plus size={16} />
            New
          </Button>
        )}
      </motion.div>

      {activeHabits.length > 0 && !showForm && (
        <motion.div variants={itemVariants}>
          <TodayProgress done={today.done} total={today.total} loading={today.loading} />
        </motion.div>
      )}

      {error && (
        <motion.div variants={itemVariants}>
          <ErrorBanner>{error}</ErrorBanner>
        </motion.div>
      )}

      {shouldShowForm ? (
        <CreateHabitForm
          onCreate={async (input) => {
            const habit = await addHabit(input)
            setShowForm(false)
            return habit
          }}
          onClose={activeHabits.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : (
        <motion.div variants={itemVariants} className="space-y-2.5">
          {activeHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
