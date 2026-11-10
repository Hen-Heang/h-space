"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AmountText, FinanceProgress } from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { krw, usd } from "@/lib/finance-format"
import { savingsGoalsLabel } from "@/lib/finance/review-display"
import type { SavingsProgress } from "@/types/finance"

const ROW =
  "-mx-2 flex min-h-14 min-w-0 items-start gap-3 rounded-md px-2 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

/**
 * Savings goals and subscriptions as two flat rows, each opening its page.
 * Replaces a whole section for the single subscriptions tile and a separate
 * savings card. Shared with the weekly and monthly reports.
 */
export function ReviewSavingsAndSubscriptions({
  progress,
  subscriptionsMonthlyKrw,
  subscriptionsId,
}: {
  progress: SavingsProgress
  subscriptionsMonthlyKrw: number
  /** Anchor id for the subscriptions row (the Review keeps `#review-subscriptions`). */
  subscriptionsId?: string
}) {
  return (
    <RowList className="border-y border-border">
      <li>
        <Link href="/finance/savings" className={ROW}>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-base font-medium leading-snug">Savings goals</span>
              {progress.goalsCount > 0 && (
                <span className="ml-auto text-base font-semibold tabular-nums">
                  {progress.overallPct}%
                </span>
              )}
            </span>
            {progress.goalsCount === 0 ? (
              <span className="mt-0.5 block text-sm text-muted-foreground">
                No savings goals yet. Create one in Savings to track progress here month over month.
              </span>
            ) : (
              <>
                <span className="mt-0.5 block [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
                  {usd.format(progress.totalSavedUsd)} of {usd.format(progress.totalTargetUsd)} ·{" "}
                  {savingsGoalsLabel(progress)}
                </span>
                <span className="mt-2 block">
                  <FinanceProgress
                    value={progress.overallPct}
                    label={`${progress.overallPct}% of combined savings targets reached`}
                    tone="positive"
                  />
                </span>
              </>
            )}
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      </li>
      <li id={subscriptionsId}>
        <Link href="/finance/subscriptions" className={ROW}>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-base font-medium leading-snug">Subscriptions</span>
              <span className="ml-auto [overflow-wrap:anywhere] text-base font-semibold tabular-nums">
                <AmountText value={krw.format(subscriptionsMonthlyKrw)} />
                <span className="font-normal text-muted-foreground">/mo</span>
              </span>
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Estimated recurring cost, excluding cancelled
            </span>
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      </li>
    </RowList>
  )
}
