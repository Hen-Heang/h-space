"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, Settings2 } from "lucide-react"
import { buttonVariants } from "@/components/finance/base/button"
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceSection,
  MonthSelector,
} from "@/components/finance/ui/finance-primitives"
import { ReviewLede } from "@/components/finance/review/review-summary"
import { ReviewBudgetPerformance } from "@/components/finance/review/review-budget-performance"
import { ReviewCategoryChanges } from "@/components/finance/review/review-category-changes"
import { ReviewSavingsAndSubscriptions } from "@/components/finance/review/review-savings-progress"
import { ReviewObservations } from "@/components/finance/review/review-observations"
import { ReviewNextMonthPlan } from "@/components/finance/review/review-next-month-plan"
import { getReviewSummary } from "@/lib/api/finance"
import { monthKeyLabel } from "@/lib/finance-cron-time"
import { usePreferences } from "@/lib/query/finance-queries"
import { monthKey, monthLabel } from "@/lib/finance-month"
import type { ReviewSummary } from "@/types/finance"

function ReviewLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading monthly review">
      <div className="max-w-2xl space-y-2">
        <div className="h-6 rounded-md bg-secondary motion-safe:animate-pulse" />
        <div className="h-6 w-4/5 rounded-md bg-secondary motion-safe:animate-pulse" />
        <div className="h-5 w-3/5 rounded-md bg-secondary motion-safe:animate-pulse" />
      </div>
      <div className="h-48 rounded-lg bg-secondary motion-safe:animate-pulse" />
      <div className="h-48 rounded-lg bg-secondary motion-safe:animate-pulse" />
    </div>
  )
}

// Defaults to last month — a review of the month still in progress isn't
// meaningful yet, same reasoning Money Flow's review page uses.
//
// Reads top to bottom as a short story: what happened (lede), what stood out,
// how budgets held, where spending moved, savings and subscriptions, then the
// one thing to do about it — next month's plan.
export function ReviewView() {
  const [monthOffset, setMonthOffset] = useState(-1)
  const [refreshKey, setRefreshKey] = useState(0)
  const requestKey = `${monthOffset}:${refreshKey}`
  const [result, setResult] = useState<{
    key: string
    summary: ReviewSummary | null
    error: string | null
  }>({
    key: "",
    summary: null,
    error: null,
  })
  // If preferences fail to load, the review stays visible rather than
  // assuming it was turned off.
  const { data: preferences } = usePreferences()
  const reviewEnabled = preferences?.monthlyReviewEnabled ?? true
  // Lives here rather than in the plan section so the confirmation survives
  // the refetch that follows an apply.
  const [appliedCount, setAppliedCount] = useState<number | null>(null)
  const loading = result.key !== requestKey
  const summary = loading ? null : result.summary
  const error = loading ? null : result.error

  useEffect(() => {
    let active = true
    void getReviewSummary(monthKey(monthOffset))
      .then((data) => {
        if (active) setResult({ key: requestKey, summary: data, error: null })
      })
      .catch(() => {
        if (active) {
          setResult({
            key: requestKey,
            summary: null,
            error: "We couldn't load the monthly review. Try again in a moment.",
          })
        }
      })
    return () => {
      active = false
    }
  }, [monthOffset, requestKey])

  function changeMonth(nextOffset: number) {
    setMonthOffset(nextOffset)
    setAppliedCount(null)
  }

  if (reviewEnabled === false) {
    return (
      <FinanceEmptyState
        icon={Settings2}
        title="Monthly review is turned off"
        description="Turn it back on in Finance Settings to see this month's review."
        action={
          <Link
            href="/finance/settings#settings-reviews"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open Finance Settings
          </Link>
        }
      />
    )
  }

  const planLabel = summary?.nextMonthPlan ? monthKeyLabel(summary.nextMonthPlan.planMonth) : null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          How income, spending, budgets, and savings changed.
        </p>
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => changeMonth(monthOffset - 1)}
          onNext={() => changeMonth(monthOffset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Review month selector"
        />
      </div>

      {error ? (
        <FinanceErrorState
          title="Review unavailable"
          description={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : loading || !summary ? (
        <ReviewLoading />
      ) : summary.totals.transactionCount === 0 ? (
        <FinanceEmptyState
          icon={CalendarClock}
          title={`Nothing recorded for ${monthLabel(monthOffset)}`}
          description="Add income or expenses in Transactions to build a review for this month."
          action={
            <Link
              href="/finance/transactions"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open Transactions
            </Link>
          }
        />
      ) : (
        <>
          <ReviewLede
            summary={summary}
            monthLabel={monthLabel(monthOffset)}
            previousMonthLabel={monthLabel(monthOffset - 1)}
            planLabel={planLabel}
          />

          <FinanceSection
            id="review-observations"
            title="Key observations"
            description="Changes worth knowing about, worked out from your numbers — no AI involved."
          >
            <ReviewObservations observations={summary.observations} />
          </FinanceSection>

          <FinanceSection
            id="review-budgets"
            title="Budget performance"
            description="How each budgeted category tracked this month."
          >
            <ReviewBudgetPerformance budgets={summary.budgetPerformance} />
          </FinanceSection>

          <FinanceSection
            id="review-category-changes"
            title="Where spending changed"
            description={`Largest swings vs. ${monthLabel(monthOffset - 1)}.`}
          >
            <ReviewCategoryChanges categoryComparison={summary.categoryComparison} />
          </FinanceSection>

          <FinanceSection
            id="review-savings"
            title="Savings and subscriptions"
            description="Combined progress across every savings goal, and what subscriptions cost."
          >
            <ReviewSavingsAndSubscriptions
              progress={summary.savingsProgress}
              subscriptionsMonthlyKrw={summary.subscriptionsMonthlyKrw}
              subscriptionsId="review-subscriptions"
            />
          </FinanceSection>

          {summary.nextMonthPlan && planLabel && (
            <FinanceSection
              id="review-next-month-plan"
              title={`Plan for ${planLabel}`}
              description="Suggested budgets from your recent spending. Nothing changes until you confirm."
            >
              <ReviewNextMonthPlan
                key={requestKey}
                month={summary.month}
                plan={summary.nextMonthPlan}
                appliedCount={appliedCount}
                onApplied={(count) => {
                  setAppliedCount(count)
                  setRefreshKey((key) => key + 1)
                }}
              />
            </FinanceSection>
          )}
        </>
      )}
    </div>
  )
}
