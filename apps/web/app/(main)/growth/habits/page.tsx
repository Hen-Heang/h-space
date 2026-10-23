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
import { useHabits } from "@/hooks/useHabits"
import { useSessionTimer } from "@/hooks/useSessionTimer"

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
            Keep only a few habits you actually want to repeat. Tap the circle to check in today.
          </p>
        </div>
        {activeHabits.length > 0 && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="shrink-0"
          >
            <Plus size={16} strokeWidth={2} />
            New
          </Button>
        )}
      </motion.div>

      {activeHabits.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5 text-sm text-muted-foreground"
        >
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          {activeHabits.length} active habit{activeHabits.length === 1 ? "" : "s"}. Finish today
          first; manage details only when needed.
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
