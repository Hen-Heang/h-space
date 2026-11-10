"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import {
  budgetAttentionLabel,
  budgetCountLabel,
  budgetLeftLabel,
  budgetTotals,
  spentOfLimitLabel,
} from "@/lib/finance/budgets-display"
import { cn } from "@/lib/utils"
import type { BudgetPerformance } from "@/types/finance"

/**
 * The page summary as one line: what's left across every budgeted category,
 * how much of the combined limit is spent, and whether anything needs
 * attention. Replaces the four summary tiles and keeps their four figures.
 */
export function BudgetSummary({
  performance,
  monthLabel,
}: {
  performance: BudgetPerformance[]
  monthLabel: string
}) {
  const totals = budgetTotals(performance)
  const over = totals.remainingKrw < 0
  const AttentionIcon = totals.attentionCount > 0 ? TriangleAlert : CircleCheck

  return (
    <section aria-labelledby="budgets-summary" className="min-w-0">
      {/* Kept as the section's anchor; the figures below say what it is. */}
      <h2 id="budgets-summary" className="sr-only">
        Summary
      </h2>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          className={cn(
            "[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight tabular-nums",
            over && "text-destructive",
          )}
        >
          <AmountText value={budgetLeftLabel(totals.remainingKrw)} />
        </p>
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium",
            totals.attentionCount > 0 ? "text-warning" : "text-success",
          )}
        >
          <AttentionIcon className="size-4 shrink-0" aria-hidden="true" />
          {budgetAttentionLabel(totals.attentionCount)}
        </p>
      </div>
      <p className="mt-1 [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
        {spentOfLimitLabel(totals.totalSpentKrw, totals.totalBudgetKrw)} spent across{" "}
        {budgetCountLabel(totals.count)}. Standing limits, measured against {monthLabel} spending.
      </p>
    </section>
  )
}
