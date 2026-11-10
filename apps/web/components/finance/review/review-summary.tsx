"use client"

import { ArrowDown } from "lucide-react"
import { reviewLede } from "@/lib/finance/review-display"
import type { ReviewSummary } from "@/types/finance"

/**
 * The Review's opening: the month told in two or three sentences, built from
 * the server's numbers. It replaces the four KPI tiles that repeated
 * Analytics — income, spending, net and savings rate are still all here.
 */
export function ReviewLede({
  summary,
  monthLabel,
  previousMonthLabel,
  planLabel,
}: {
  summary: ReviewSummary
  monthLabel: string
  previousMonthLabel: string
  /** "December 2026" when a next-month plan follows; adds a jump link to it. */
  planLabel: string | null
}) {
  const lede = reviewLede({
    totals: summary.totals,
    previousTotals: summary.previousTotals,
    budgets: summary.budgetPerformance,
    monthLabel,
    previousMonthLabel,
  })
  const count = summary.totals.transactionCount

  return (
    <section aria-labelledby="review-summary" className="min-w-0 space-y-2">
      <h2 id="review-summary" className="sr-only">
        {monthLabel} summary
      </h2>
      <p
        className="max-w-2xl [overflow-wrap:anywhere] text-lg font-medium leading-relaxed text-foreground sm:text-xl"
        data-testid="review-lede"
      >
        {lede.headline}
      </p>
      {lede.details.length > 0 && (
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {lede.details.join(" ")}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        <span>
          From {count} {count === 1 ? "transaction" : "transactions"}
        </span>
        {planLabel && (
          <a
            href="#review-next-month-plan"
            className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Plan for {planLabel}
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        )}
      </p>
    </section>
  )
}
