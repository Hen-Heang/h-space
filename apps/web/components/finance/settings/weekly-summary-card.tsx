"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { ReviewBudgetPerformance } from "@/components/finance/review/review-budget-performance"
import { ReviewSavingsAndSubscriptions } from "@/components/finance/review/review-savings-progress"
import { ReportTopCategories } from "@/components/finance/settings/report-top-categories"
import { ReportFigures, ReportPart, toneOf } from "@/components/finance/settings/report-figures"
import { krw } from "@/lib/finance-format"
import type { WeeklySummary } from "@/types/finance"

function formatRange(weekStart: string, weekEnd: string): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${format(weekStart)} – ${format(weekEnd)}`
}

// Flat parts under plain headings — no tiles or cards inside the Reports
// area. Also rendered by the printable page (app/reports-print).
export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const ChangeIcon =
    summary.expenseChangePct === null || summary.expenseChangePct === 0
      ? Minus
      : summary.expenseChangePct > 0
        ? ArrowUpRight
        : ArrowDownRight
  const changeToneClass =
    summary.expenseChangePct === null || summary.expenseChangePct === 0
      ? "text-muted-foreground"
      : summary.expenseChangePct > 0
        ? "text-destructive"
        : "text-success"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {formatRange(summary.weekStart, summary.weekEnd)}
        </p>
        <ReportFigures
          figures={[
            { label: "Income", value: krw.format(summary.incomeKrw) },
            { label: "Expenses", value: krw.format(summary.expenseKrw) },
            {
              label: "Net",
              value: krw.format(summary.netCashFlowKrw),
              tone: toneOf(summary.netCashFlowKrw),
            },
          ]}
        />
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <ChangeIcon className={`size-4 shrink-0 ${changeToneClass}`} aria-hidden="true" />
          <span className={changeToneClass}>
            {summary.expenseChangePct === null
              ? "No spending last week to compare."
              : summary.expenseChangePct === 0
                ? "Same spending as last week."
                : `${Math.abs(summary.expenseChangePct)}% ${summary.expenseChangePct > 0 ? "more" : "less"} than last week`}
          </span>
          {summary.expenseChangePct !== null && (
            <span className="text-muted-foreground">
              ({krw.format(summary.previousWeekExpenseKrw)} last week)
            </span>
          )}
        </p>
      </div>

      <ReportPart title="Top categories">
        <ReportTopCategories categories={summary.topCategories} />
      </ReportPart>

      {summary.budgetWarnings.length > 0 && (
        <ReportPart title="Budget warnings">
          <ReviewBudgetPerformance budgets={summary.budgetWarnings} />
        </ReportPart>
      )}

      <ReportPart title="Savings and subscriptions">
        <ReviewSavingsAndSubscriptions
          progress={summary.savingsProgress}
          subscriptionsMonthlyKrw={summary.subscriptionsMonthlyKrw}
        />
      </ReportPart>
    </div>
  )
}
