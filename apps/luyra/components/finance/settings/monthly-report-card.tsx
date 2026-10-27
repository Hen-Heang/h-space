"use client";

import { CalendarClock } from "lucide-react";
import { FinanceMetricCard } from "@/components/finance/ui/finance-primitives";
import { ReviewSummaryCards } from "@/components/finance/review/review-summary";
import { ReviewBudgetPerformance } from "@/components/finance/review/review-budget-performance";
import { ReviewCategoryChanges } from "@/components/finance/review/review-category-changes";
import { ReviewSavingsProgressCard } from "@/components/finance/review/review-savings-progress";
import { ReviewObservations } from "@/components/finance/review/review-observations";
import { ReportTopCategories } from "@/components/finance/settings/report-top-categories";
import { krw } from "@/lib/finance-format";
import type { MonthlyReport } from "@/types/finance";

export function MonthlyReportCard({ report, monthLabel }: { report: MonthlyReport; monthLabel: string }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{monthLabel}</p>

      <ReviewSummaryCards totals={report.totals} />

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Top categories</p>
        <ReportTopCategories categories={report.topCategories} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Budget performance</p>
        <ReviewBudgetPerformance budgets={report.budgetPerformance} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Where spending changed</p>
        <ReviewCategoryChanges categoryComparison={report.categoryComparison} />
      </div>

      <FinanceMetricCard
        label="Subscriptions"
        value={`${krw.format(report.subscriptionsMonthlyKrw)}/mo`}
        detail="Estimated recurring cost"
        icon={CalendarClock}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Savings progress</p>
        <ReviewSavingsProgressCard progress={report.savingsProgress} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Important changes</p>
        <ReviewObservations observations={report.observations} />
      </div>
    </div>
  );
}
