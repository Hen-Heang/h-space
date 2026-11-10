"use client"

import { ReviewBudgetPerformance } from "@/components/finance/review/review-budget-performance"
import { ReviewCategoryChanges } from "@/components/finance/review/review-category-changes"
import { ReviewSavingsAndSubscriptions } from "@/components/finance/review/review-savings-progress"
import { ReviewObservations } from "@/components/finance/review/review-observations"
import { ReportTopCategories } from "@/components/finance/settings/report-top-categories"
import { ReportFigures, ReportPart, toneOf } from "@/components/finance/settings/report-figures"
import { krw } from "@/lib/finance-format"
import type { MonthlyReport } from "@/types/finance"

// Flat parts under plain headings — no tiles or cards inside the Reports
// area. Also rendered by the printable page (app/reports-print).
export function MonthlyReportCard({
  report,
  monthLabel,
}: {
  report: MonthlyReport
  monthLabel: string
}) {
  const { totals } = report
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {monthLabel} · {totals.transactionCount}{" "}
          {totals.transactionCount === 1 ? "transaction" : "transactions"}
        </p>
        <ReportFigures
          figures={[
            { label: "Income", value: krw.format(totals.totalIncomeKrw) },
            { label: "Expenses", value: krw.format(totals.totalExpenseKrw) },
            {
              label: "Savings",
              value: krw.format(totals.netCashFlowKrw),
              tone: toneOf(totals.netCashFlowKrw),
            },
            { label: "Savings rate", value: `${totals.savingsRatePct}%` },
          ]}
        />
      </div>

      <ReportPart title="Top categories">
        <ReportTopCategories categories={report.topCategories} />
      </ReportPart>

      <ReportPart title="Budget performance">
        <ReviewBudgetPerformance budgets={report.budgetPerformance} />
      </ReportPart>

      <ReportPart title="Where spending changed">
        <ReviewCategoryChanges categoryComparison={report.categoryComparison} />
      </ReportPart>

      <ReportPart title="Savings and subscriptions">
        <ReviewSavingsAndSubscriptions
          progress={report.savingsProgress}
          subscriptionsMonthlyKrw={report.subscriptionsMonthlyKrw}
        />
      </ReportPart>

      <ReportPart title="Important changes">
        <ReviewObservations observations={report.observations} />
      </ReportPart>
    </div>
  )
}
