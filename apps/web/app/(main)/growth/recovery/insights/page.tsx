"use client"

import { RecoveryInsights } from "@/components/recovery/RecoveryInsights"
import { BackLink } from "@/components/ui/back-link"
import { ErrorBanner } from "@/components/ui/error-banner"
import { useRecoveryEvents, useRecoveryHabits, useRecoveryTriggers } from "@/hooks/useRecovery"

export default function RecoveryInsightsPage() {
  const { activeHabit: target, loading: targetLoading, error: targetError } = useRecoveryHabits()
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
  } = useRecoveryEvents(target?.id ?? null)
  const { triggers, loading: triggersLoading, error: triggersError } = useRecoveryTriggers()
  if (targetLoading || eventsLoading || triggersLoading) return null
  const error = targetError || eventsError || triggersError
  if (error || !target)
    return (
      <div className="mx-auto max-w-5xl pt-10">
        <ErrorBanner>{error || "Create a private recovery plan first."}</ErrorBanner>
      </div>
    )
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-14">
      <BackLink href="/growth/recovery" label="Recovery" />
      <div>
        <p className="app-kicker">Progress & insights</p>
        <h2 className="mt-1 text-2xl font-semibold">Understand patterns without judgment</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          All calculations are deterministic and based only on records you chose to save.
        </p>
      </div>
      <RecoveryInsights target={target} events={events} triggers={triggers} />
    </div>
  )
}
