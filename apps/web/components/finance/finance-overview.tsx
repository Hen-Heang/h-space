"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ReceiptText } from "lucide-react"

import { buttonVariants } from "@/components/finance/base/button"
import { BudgetSpending } from "@/components/finance/overview/budget-spending"
import { CashFlowSummary } from "@/components/finance/overview/cash-flow-summary"
import { NeedsAttention } from "@/components/finance/overview/needs-attention"
import {
  FinancialHealth,
  ReviewLink,
  SpendingTrend,
} from "@/components/finance/overview/overview-insights"
import { RecentActivity } from "@/components/finance/overview/recent-activity"
import {
  FinanceEmptyState,
  FinanceErrorState,
  MonthSelector,
} from "@/components/finance/ui/finance-primitives"
import { ApiError } from "@/lib/api/finance-client"
import { monthKey, monthLabel } from "@/lib/finance-month"
import { overviewQuery } from "@/lib/query/finance-queries"
import type { FinanceOverviewSummary } from "@/types/finance"

/*
 * Finance Overview, top to bottom (docs/design-system.md: sections, not boxes):
 *   1. month selector (the primary action, Add transaction, is the floating
 *      button every Finance page shares)
 *   2. net cash flow, with income and expenses side by side and the savings rate
 *   3. budget and spending: what's left, the daily guide, top categories
 *   4. recent activity
 *   5. needs attention: budget alerts, unclassified spending, missing income
 *   6. insights: financial health, the daily spending trend, the month's review
 * Every number comes from the server-computed FinanceOverviewSummary; this
 * component and components/finance/overview/* only lay it out.
 */
export function overviewErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session has expired. Sign in again to load your Finance overview."
    // The code/status pair is what makes a report diagnosable ("500
    // INTERNAL_ERROR" vs "504 HTTP_ERROR" from a platform timeout).
    const detail = error.status ? `${error.status} ${error.code}` : error.code
    return `We couldn't load your Finance overview (${detail}). Try again in a moment.`
  }
  if (error instanceof TypeError)
    return "We couldn't reach the server. Check your connection and try again."
  return "We couldn't load your Finance overview. Try again in a moment."
}

function OverviewLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading Finance summary">
      <div className="h-60 rounded-lg bg-secondary motion-safe:animate-pulse" />
      <div className="space-y-3">
        <div className="h-6 w-44 rounded-md bg-secondary motion-safe:animate-pulse" />
        <div className="h-72 rounded-lg bg-secondary motion-safe:animate-pulse" />
      </div>
    </div>
  )
}

export function FinanceOverview({
  initialMonth,
  initialSummary,
}: {
  /** YYYY-MM that the server prefetched `initialSummary` for. */
  initialMonth?: string
  initialSummary?: FinanceOverviewSummary
}) {
  const [monthOffset, setMonthOffset] = useState(0)
  const month = monthKey(monthOffset)
  const label = monthLabel(monthOffset)
  const overview = useQuery({
    ...overviewQuery(month),
    // Seeding from the server keeps the amounts on screen from the first paint.
    // The month guard covers a browser whose "this month" differs from the
    // server's; that month then fetches on mount like any other.
    initialData: initialSummary && initialMonth === month ? initialSummary : undefined,
  })
  // A failed background refresh keeps the month already on screen; only a
  // month with nothing to show becomes the error state.
  const summary = overview.data ?? null
  const error = overview.isError && !overview.data ? overviewErrorMessage(overview.error) : null

  useEffect(() => {
    if (overview.error) console.error("[finance] overview request failed", overview.error)
  }, [overview.error])

  return (
    <div className="space-y-8">
      <MonthSelector
        label={label}
        onPrevious={() => setMonthOffset((offset) => offset - 1)}
        onNext={() => setMonthOffset((offset) => offset + 1)}
        nextDisabled={monthOffset >= 0}
        ariaLabel="Finance month selector"
      />

      {error ? (
        <FinanceErrorState
          title="Finance overview unavailable"
          description={error}
          onRetry={() => void overview.refetch()}
        />
      ) : !summary ? (
        <OverviewLoading />
      ) : (
        <OverviewContent summary={summary} monthLabel={label} isCurrentMonth={monthOffset === 0} />
      )}
    </div>
  )
}

function OverviewContent({
  summary,
  monthLabel: label,
  isCurrentMonth,
}: {
  summary: FinanceOverviewSummary
  monthLabel: string
  isCurrentMonth: boolean
}) {
  const hasTransactions = summary.totals.transactionCount > 0

  return (
    <>
      <CashFlowSummary
        totals={summary.totals}
        savingsHealth={summary.savingsHealth}
        monthLabel={label}
      />

      <BudgetSpending
        budgetHealth={summary.budgetHealth}
        dailyBudget={summary.dailyBudget}
        categories={summary.categories}
        budgets={summary.budgetPerformance}
        totalExpenseKrw={summary.totals.totalExpenseKrw}
        isCurrentMonth={isCurrentMonth}
      />

      {hasTransactions && summary.recentTransactions.length > 0 ? (
        <RecentActivity transactions={summary.recentTransactions} />
      ) : (
        <FinanceEmptyState
          icon={ReceiptText}
          title={`No transactions in ${label}`}
          description="Add an income or expense with the + button to fill in spending, trends and recent activity."
          action={
            <Link
              href="/finance/transactions"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open Transactions
            </Link>
          }
        />
      )}

      <NeedsAttention
        budgets={summary.budgetPerformance}
        unclassifiedKrw={summary.financialHealth.unclassifiedKrw}
        missingIncome={summary.financialHealth.overallStatus === "unavailable"}
      />

      <FinancialHealth health={summary.financialHealth} />

      {hasTransactions && (
        <>
          <SpendingTrend data={summary.dailySpending} />
          <ReviewLink monthLabel={label} />
        </>
      )}
    </>
  )
}
