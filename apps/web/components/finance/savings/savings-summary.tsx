"use client"

import { AmountText, FinanceProgress } from "@/components/finance/ui/finance-primitives"
import { usd } from "@/lib/finance-format"
import { goalsReachedLabel, savingsTotals } from "@/lib/finance/savings-display"
import type { SavingsGoal } from "@/types/finance"

/**
 * Combined progress as one line — saved of target, the overall percent and
 * how many goals are reached. Replaces the four summary tiles and keeps
 * their four figures.
 */
export function SavingsSummary({ goals }: { goals: SavingsGoal[] }) {
  const totals = savingsTotals(goals)

  return (
    <section aria-labelledby="savings-summary" className="min-w-0">
      {/* Kept as the section's anchor; the figures below say what it is. */}
      <h2 id="savings-summary" className="sr-only">
        Summary
      </h2>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight tabular-nums">
          <AmountText value={usd.format(totals.totalSavedUsd)} />{" "}
          <span className="text-base font-medium text-muted-foreground">saved</span>
        </p>
        <p className="text-sm font-medium tabular-nums">{totals.overallPct}% of combined targets</p>
      </div>
      <div className="mt-2">
        <FinanceProgress
          value={totals.overallPct}
          label={`${totals.overallPct}% saved of combined targets`}
        />
      </div>
      <p className="mt-2 [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
        Target {usd.format(totals.totalTargetUsd)} ·{" "}
        {goalsReachedLabel(totals.reachedCount, totals.count)}
      </p>
    </section>
  )
}
