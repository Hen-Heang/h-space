"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { DebriefForm } from "@/components/recovery/DebriefForm"
import { ErrorBanner } from "@/components/ui/error-banner"
import { RecoveryPageSkeleton } from "@/components/recovery/RecoveryPageSkeleton"
import { useRecoveryEvents, useRecoveryHabits, useRecoveryPlans } from "@/hooks/useRecovery"
import { useSessionTimer } from "@/hooks/useSessionTimer"

type DebriefContext = { eventId?: string; habitId?: string }

function readDebriefContext(): DebriefContext {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(sessionStorage.getItem("hengo-recovery-debrief") ?? "{}") as DebriefContext
  } catch {
    return {}
  }
}

export default function RecoveryDebriefPage() {
  useSessionTimer("recovery")
  const router = useRouter()
  const [context] = useState(readDebriefContext)
  const { habits, activeHabit, loading: habitsLoading, error: habitsError } = useRecoveryHabits()
  const habit = habits.find((item) => item.id === context.habitId) ?? activeHabit
  const { annotateEvent, error: eventsError } = useRecoveryEvents(habit?.id ?? null)
  const { addPlan, error: plansError } = useRecoveryPlans(habit?.id ?? null)

  if (habitsLoading) return <RecoveryPageSkeleton width="lg" header={false} cards={1} />
  const error = habitsError || eventsError || plansError
  if (error || !habit)
    return (
      <div className="mx-auto max-w-lg pt-10">
        <ErrorBanner>{error || "Create a private recovery plan first."}</ErrorBanner>
      </div>
    )

  return (
    <div className="pb-12">
      <DebriefForm
        onSave={async ({ reflection, ifText, thenText }) => {
          if (context.eventId && reflection) await annotateEvent(context.eventId, reflection)
          if (ifText && thenText)
            await addPlan({ ifText, thenText, sourceEventId: context.eventId })
          sessionStorage.removeItem("hengo-recovery-debrief")
          router.push("/growth/recovery")
        }}
      />
    </div>
  )
}
