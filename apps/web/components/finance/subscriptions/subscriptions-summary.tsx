"use client"

import { Clock3 } from "lucide-react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import {
  activeCountLabel,
  planToCancelLabel,
  subscriptionTotals,
} from "@/lib/finance/subscriptions-display"
import { cn } from "@/lib/utils"
import type { DetectedSubscription } from "@/types/finance"

/**
 * Estimated recurring cost as one line — per month, per year, how many are
 * active and how many are marked for cancellation. Replaces the four summary
 * tiles and keeps their four figures. Cancelled ones don't count toward cost.
 */
export function SubscriptionsSummary({ subscriptions }: { subscriptions: DetectedSubscription[] }) {
  const totals = subscriptionTotals(subscriptions)
  const pending = totals.planToCancelCount > 0

  return (
    <section aria-labelledby="subscriptions-summary" className="min-w-0">
      {/* Kept as the section's anchor; the figures below say what it is. */}
      <h2 id="subscriptions-summary" className="sr-only">
        Summary
      </h2>
      <p className="[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight tabular-nums">
        <AmountText value={krw.format(totals.monthlyKrw)} />
        <span className="text-base font-medium text-muted-foreground">/mo</span>
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
        <span>Estimated {krw.format(totals.yearlyKrw)} a year, excluding cancelled</span>
        <span aria-hidden="true">·</span>
        <span>{activeCountLabel(totals.activeCount)}</span>
        <span aria-hidden="true">·</span>
        <span
          className={cn("inline-flex items-center gap-1", pending && "font-medium text-warning")}
        >
          {pending && <Clock3 className="size-4 shrink-0" aria-hidden="true" />}
          {planToCancelLabel(totals.planToCancelCount)}
        </span>
      </p>
    </section>
  )
}
