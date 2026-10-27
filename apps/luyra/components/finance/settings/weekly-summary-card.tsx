"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { ReviewBudgetPerformance } from "@/components/finance/review/review-budget-performance";
import { ReviewSavingsProgressCard } from "@/components/finance/review/review-savings-progress";
import { ReportTopCategories } from "@/components/finance/settings/report-top-categories";
import { krw } from "@/lib/finance-format";
import type { WeeklySummary } from "@/types/finance";

function formatRange(weekStart: string, weekEnd: string): string {
  const format = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${format(weekStart)} – ${format(weekEnd)}`;
}

export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const ChangeIcon = summary.expenseChangePct === null || summary.expenseChangePct === 0 ? Minus : summary.expenseChangePct > 0 ? ArrowUpRight : ArrowDownRight;
  const changeToneClass = summary.expenseChangePct === null || summary.expenseChangePct === 0
    ? "text-muted-foreground"
    : summary.expenseChangePct > 0
      ? "text-destructive"
      : "text-success";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{formatRange(summary.weekStart, summary.weekEnd)}</p>

      <FinanceMetricGrid columns={3}>
        <FinanceMetricCard label="Income" value={krw.format(summary.incomeKrw)} detail="This week" icon={ArrowUpRight} tone="positive" />
        <FinanceMetricCard label="Expenses" value={krw.format(summary.expenseKrw)} detail="This week" icon={ArrowDownRight} tone="expense" />
        <FinanceMetricCard
          label="Net"
          value={krw.format(summary.netCashFlowKrw)}
          detail="Income minus expenses"
          icon={Minus}
          tone={summary.netCashFlowKrw > 0 ? "positive" : summary.netCashFlowKrw < 0 ? "expense" : "neutral"}
        />
      </FinanceMetricGrid>

      <div className="flex items-center gap-1.5 text-xs">
        <ChangeIcon className={`size-3.5 ${changeToneClass}`} aria-hidden="true" />
        <span className={changeToneClass}>
          {summary.expenseChangePct === null
            ? "No spending last week to compare."
            : summary.expenseChangePct === 0
              ? "Same spending as last week."
              : `${Math.abs(summary.expenseChangePct)}% ${summary.expenseChangePct > 0 ? "more" : "less"} than last week`}
        </span>
        {summary.expenseChangePct !== null && <span className="text-muted-foreground">({krw.format(summary.previousWeekExpenseKrw)} last week)</span>}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Top categories</p>
        <ReportTopCategories categories={summary.topCategories} />
      </div>

      {summary.budgetWarnings.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Budget warnings</p>
          <ReviewBudgetPerformance budgets={summary.budgetWarnings} />
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Savings progress</p>
        <ReviewSavingsProgressCard progress={summary.savingsProgress} />
      </div>

      <FinanceMetricCard
        label="Subscriptions"
        value={`${krw.format(summary.subscriptionsMonthlyKrw)}/mo`}
        detail="Estimated recurring cost"
        icon={ArrowDownRight}
      />
    </div>
  );
}
