"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { FinanceEmptyState, FinanceErrorState, FinanceMetricGrid, FinanceSection, MonthSelector } from "@/components/finance/ui/finance-primitives";
import { AnalyticsSummaryCards } from "@/components/finance/analytics/analytics-summary";
import { CashFlowTrendChart } from "@/components/finance/analytics/cash-flow-trend-chart";
import { CategoryDistribution } from "@/components/finance/analytics/category-distribution";
import { PaymentMethodBreakdown } from "@/components/finance/analytics/payment-method-breakdown";
import { MonthComparison } from "@/components/finance/analytics/month-comparison";
import { monthKey, monthLabel } from "@/lib/finance-month";
import { analyticsQuery } from "@/lib/query/finance-queries";

function AnalyticsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <FinanceMetricGrid>
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-28 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </FinanceMetricGrid>
      <div className="h-64 rounded-2xl bg-secondary motion-safe:animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        <div className="h-56 rounded-2xl bg-secondary motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const [monthOffset, setMonthOffset] = useState(0);
  const analytics = useQuery(analyticsQuery(monthKey(monthOffset)));
  const summary = analytics.data ?? null;
  const loading = analytics.isPending;
  // A failed background refresh keeps the month already on screen.
  const error = analytics.isError && !analytics.data ? "We couldn't load your analytics. Try again in a moment." : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-5 text-muted-foreground">Trends, categories, and payment methods for the selected month.</p>
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => setMonthOffset((offset) => offset - 1)}
          onNext={() => setMonthOffset((offset) => offset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Analytics month selector"
        />
      </div>

      {error ? (
        <FinanceErrorState title="Analytics unavailable" description={error} onRetry={() => void analytics.refetch()} />
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
          <FinanceSection id="analytics-summary" title="Summary" description={`Your ${monthLabel(monthOffset)} totals.`}>
            <AnalyticsSummaryCards totals={summary.totals} />
          </FinanceSection>

          <FinanceSection id="analytics-trend" title="Cash flow trend" description="Daily income and expenses across the selected month.">
            <CashFlowTrendChart data={summary.dailyTrend} />
          </FinanceSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <FinanceSection id="analytics-categories" title="Category distribution" description="Share of this month's expenses by category.">
              <CategoryDistribution categories={summary.categories} />
            </FinanceSection>
            <FinanceSection id="analytics-payment-methods" title="Payment methods" description="Share of this month's expenses by how you paid.">
              <PaymentMethodBreakdown paymentMethods={summary.paymentMethods} />
            </FinanceSection>
          </div>

          <FinanceSection id="analytics-comparison" title="Month comparison" description="How this month compares with the previous one.">
            <MonthComparison
              monthLabel={monthLabel(monthOffset)}
              previousMonthLabel={monthLabel(monthOffset - 1)}
              totals={summary.totals}
              previousTotals={summary.previousTotals}
            />
          </FinanceSection>
        </>
      )}
    </div>
  );
}
