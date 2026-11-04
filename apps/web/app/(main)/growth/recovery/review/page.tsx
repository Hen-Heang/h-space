"use client"

import { WeeklyReviewCard } from "@/components/recovery/WeeklyReviewCard"
import { BackLink } from "@/components/ui/back-link"
import { ErrorBanner } from "@/components/ui/error-banner"
import {
  useRecoveryDailyCheckIns,
  useRecoveryEvents,
  useRecoveryHabits,
  useRecoveryPrivacy,
  useRecoveryTriggers,
  useRecoveryWeeklyReviews,
} from "@/hooks/useRecovery"

export default function RecoveryReviewPage() {
  const { activeHabit: target, loading: targetLoading, error: targetError } = useRecoveryHabits()
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
  } = useRecoveryEvents(target?.id ?? null)
  const {
    checkIns,
    loading: checkInsLoading,
    error: checkInsError,
  } = useRecoveryDailyCheckIns(target?.id ?? null)
  const { triggers, loading: triggersLoading, error: triggersError } = useRecoveryTriggers()
  const { settings } = useRecoveryPrivacy()
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    saveReview,
  } = useRecoveryWeeklyReviews(target?.id ?? null)
  if (targetLoading || eventsLoading || checkInsLoading || triggersLoading || reviewsLoading)
    return null
  const error = targetError || eventsError || checkInsError || triggersError || reviewsError
  if (error || !target)
    return (
      <div className="mx-auto max-w-4xl pt-10">
        <ErrorBanner>{error || "Create a private recovery plan first."}</ErrorBanner>
      </div>
    )
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-14">
      <BackLink href="/growth/recovery" label="Recovery" />
      <div>
        <p className="app-kicker">Weekly review</p>
        <h2 className="mt-1 text-2xl font-semibold">Learn from the week, then adjust one thing</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This review uses deterministic statistics first. Honest records add context; they never
          erase progress.
        </p>
      </div>
      <WeeklyReviewCard
        events={events}
        checkIns={checkIns}
        triggers={triggers}
        previousReview={reviews[0]}
        aiConsent={settings?.aiConsent ?? false}
        onSave={saveReview}
      />
    </div>
  )
}
