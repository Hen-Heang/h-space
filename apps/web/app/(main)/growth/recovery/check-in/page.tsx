"use client"

import { BackLink } from "@/components/ui/back-link"
import { DailyCheckInForm } from "@/components/recovery/DailyCheckInForm"
import { ErrorBanner } from "@/components/ui/error-banner"
import { RecoveryPageSkeleton } from "@/components/recovery/RecoveryPageSkeleton"
import { useHabits } from "@/hooks/useHabits"
import { useRecoveryDailyCheckIns, useRecoveryEvents, useRecoveryHabits } from "@/hooks/useRecovery"

function localDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

export default function RecoveryCheckInPage() {
  const { activeHabit: target, loading: targetsLoading, error: targetsError } = useRecoveryHabits()
  const { activeHabits } = useHabits()
  const { saveCheckIn, error: checkInError } = useRecoveryDailyCheckIns(target?.id ?? null)
  const { events, logEvent, error: eventsError } = useRecoveryEvents(target?.id ?? null)
  if (targetsLoading) return <RecoveryPageSkeleton width="lg" header={false} cards={1} />
  const error = targetsError || checkInError || eventsError
  if (error || !target)
    return (
      <div className="mx-auto max-w-lg pt-10">
        <ErrorBanner>{error || "Create a private recovery plan first."}</ErrorBanner>
      </div>
    )

  return (
    <div className="pb-14">
      <div className="mx-auto mb-3 max-w-lg">
        <BackLink href="/growth/recovery" label="Recovery" />
      </div>
      <DailyCheckInForm
        healthyHabits={activeHabits.map((habit) => habit.label)}
        onSave={async (input) => {
          await saveCheckIn(input)
          if (input.targetOccurred) {
            const alreadyLogged = events.some(
              (event) => event.kind === "slip" && localDate(event.occurredAt) === input.date,
            )
            if (!alreadyLogged)
              await logEvent({
                kind: "slip",
                intensity: input.strongestUrge ?? input.currentUrge,
                note: input.lesson,
              })
          }
        }}
      />
    </div>
  )
}
