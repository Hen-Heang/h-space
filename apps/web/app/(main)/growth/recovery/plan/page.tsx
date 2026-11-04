"use client"

import { BackLink } from "@/components/ui/back-link"
import { ErrorBanner } from "@/components/ui/error-banner"
import { PlansList } from "@/components/recovery/PlansList"
import { ProtectionChecklist } from "@/components/recovery/ProtectionChecklist"
import { WhenThenPlanBuilder } from "@/components/recovery/WhenThenPlanBuilder"
import {
  useRecoveryHabits,
  useRecoveryPlans,
  useRecoveryProtection,
  useRecoveryTriggers,
} from "@/hooks/useRecovery"

export default function RecoveryPlanPage() {
  const { activeHabit: target, loading: targetLoading, error: targetError } = useRecoveryHabits()
  const {
    plans,
    duePlans,
    loading: plansLoading,
    error: plansError,
    addPlan,
    reviewPlan,
    updatePlan,
    deletePlan,
  } = useRecoveryPlans(target?.id ?? null)
  const {
    items,
    loading: protectionLoading,
    error: protectionError,
    saveItem,
  } = useRecoveryProtection(target?.id ?? null)
  const { triggers } = useRecoveryTriggers()
  if (targetLoading || plansLoading || protectionLoading) return null
  const error = targetError || plansError || protectionError
  if (error || !target)
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <ErrorBanner>{error || "Create a private recovery plan first."}</ErrorBanner>
      </div>
    )
  const firstTrigger = triggers[0]
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-14">
      <BackLink href="/growth/recovery" label="Recovery" />
      <div>
        <p className="app-kicker">Recovery plan</p>
        <h2 className="mt-1 text-2xl font-semibold">Prepare before the difficult moment</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Rehearse a small response and make your environment support it.
        </p>
      </div>
      <WhenThenPlanBuilder
        suggestion={
          firstTrigger
            ? {
                ifText: firstTrigger.label,
                thenText:
                  "I will leave the room, take three slow breaths, and begin a five-minute safe task",
              }
            : undefined
        }
        onCreate={addPlan}
      />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Saved When–Then plans</h2>
        <PlansList
          plans={plans}
          duePlans={duePlans}
          onReview={reviewPlan}
          onUpdate={updatePlan}
          onDelete={deletePlan}
        />
      </section>
      <ProtectionChecklist items={items} onSave={saveItem} />
    </div>
  )
}
