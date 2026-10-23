"use client";

import { CategoryIcon, FinanceEmptyState, FinanceProgress } from "@/components/finance/ui/finance-primitives";
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status";
import { Scale } from "lucide-react";
import { krw } from "@/lib/finance-format";
import type { BudgetPerformance } from "@/types/finance";

export function ReviewBudgetPerformance({ budgets }: { budgets: BudgetPerformance[] }) {
  if (budgets.length === 0) {
    return (
      <FinanceEmptyState icon={Scale} title="No budgets set" description="Set category budgets to see performance in future reviews." />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="divide-y divide-border">
        {budgets.map((budget) => {
          const status = BUDGET_STATUS_META[budget.status];
          const StatusIcon = status.icon;
          return (
            <div key={budget.categoryId} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={budget.categoryIcon} color={budget.categoryColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:justify-between xs:gap-3">
                    <p className="truncate text-sm font-semibold">{budget.categoryName}</p>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${BUDGET_STATUS_TEXT_CLASS[budget.status]}`}>
                      <StatusIcon className="size-3.5" aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {krw.format(budget.spentKrw)} of {krw.format(budget.budgetKrw)} · {budget.usagePct}%
                  </p>
                  <div className="mt-2">
                    <FinanceProgress value={budget.usagePct} label={`${budget.categoryName} budget ${budget.usagePct}% used`} tone={status.tone} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
