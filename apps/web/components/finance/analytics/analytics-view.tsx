"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3 } from "lucide-react"
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceSection,
  MonthSelector,
} from "@/components/finance/ui/finance-primitives"
import { AnalyticsSummary } from "@/components/finance/analytics/analytics-summary"
import { CashFlowTrendChart } from "@/components/finance/analytics/cash-flow-trend-chart"
import { CategoryDistribution } from "@/components/finance/analytics/category-distribution"
import { PaymentMethodBreakdown } from "@/components/finance/analytics/payment-method-breakdown"
import { entryCountLabel } from "@/lib/finance/overview-display"
import { monthKey, monthLabel } from "@/lib/finance-month"
import { analyticsQuery } from "@/lib/query/finance-queries"

function AnalyticsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="h-36 rounded-lg bg-secondary motion-safe:animate-pulse" />
      <div className="h-64 rounded-lg bg-secondary motion-safe:animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-lg bg-secondary motion-safe:animate-pulse" />
        <div className="h-56 rounded-lg bg-secondary motion-safe:animate-pulse" />
      </div>
    </div>
  )
}

// Each figure appears once: the summary carries income, expenses, net and
// savings rate with their change since last month (it absorbed the old Month
// comparison), the chart shows the daily shape, and the two ranked lists show
// where the money went and how it was paid.
export function AnalyticsView() {
  const [monthOffset, setMonthOffset] = useState(0)
  const analytics = useQuery(analyticsQuery(monthKey(monthOffset)))
  const summary = analytics.data ?? null
  const loading = analytics.isPending
  // A failed background refresh keeps the month already on screen.
  const error =
    analytics.isError && !analytics.data
      ? "We couldn't load your analytics. Try again in a moment."
      : null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Trends, categories, and payment methods for the selected month.
        </p>
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => setMonthOffset((offset) => offset - 1)}
          onNext={() => setMonthOffset((offset) => offset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Analytics month selector"
        />
      </div>

      {error ? (
        <FinanceErrorState
          title="Analytics unavailable"
          description={error}
          onRetry={() => void analytics.refetch()}
        />
      ) : loading || !summary ? (
        <AnalyticsLoading />
      ) : summary.totals.transactionCount === 0 ? (
        <FinanceEmptyState
          icon={BarChart3}
          title={`No transactions in ${monthLabel(monthOffset)}`}
          description="Add income or expenses in Transactions to see trends, category distribution, and payment method breakdowns here."
        />
      ) : (
        <>
          <FinanceSection
            id="analytics-summary"
            title="Summary"
            description={`${monthLabel(monthOffset)} from ${entryCountLabel(summary.totals.transactionCount)}, compared with ${monthLabel(monthOffset - 1)}.`}
          >
            <AnalyticsSummary totals={summary.totals} previousTotals={summary.previousTotals} />
          </FinanceSection>

          <FinanceSection
            id="analytics-trend"
            title="Cash flow trend"
            description="Daily income and expenses. Pick a day — tap, drag, or use the arrow keys — to see its figures."
          >
            <CashFlowTrendChart data={summary.dailyTrend} />
          </FinanceSection>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
            <FinanceSection
              id="analytics-categories"
              title="Category distribution"
              description="Share of this month's expenses by category."
            >
              <CategoryDistribution categories={summary.categories} />
            </FinanceSection>
            <FinanceSection
              id="analytics-payment-methods"
              title="Payment methods"
              description="Share of this month's expenses by how you paid."
            >
              <PaymentMethodBreakdown paymentMethods={summary.paymentMethods} />
            </FinanceSection>
          </div>
        </>
      )}
    </div>
  )
}
