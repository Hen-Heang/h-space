"use client"

import Link from "next/link"
import { CategoryIcon, FinanceProgress } from "@/components/finance/ui/finance-primitives"
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status"
import { RowList } from "@/components/ui/row-list"
import { krw } from "@/lib/finance-format"
import { cn } from "@/lib/utils"
import type { BudgetPerformance } from "@/types/finance"

/**
 * One flat row per budgeted category: name and status on the first line,
 * spent of limit below, then a thin bar. Shared with the weekly and monthly
 * reports.
 */
export function ReviewBudgetPerformance({ budgets }: { budgets: BudgetPerformance[] }) {
  if (budgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets set.{" "}
        <Link
          href="/finance/budgets"
          className="font-medium text-primary underline underline-offset-4"
        >
          Set category budgets
        </Link>{" "}
        to see performance in future reviews.
      </p>
    )
  }

  return (
    <RowList className="border-y border-border">
      {budgets.map((budget) => {
        const status = BUDGET_STATUS_META[budget.status]
        const StatusIcon = status.icon
        return (
          <li key={budget.categoryId} className="flex items-start gap-3 py-3">
            <CategoryIcon
              icon={budget.categoryIcon}
              color={budget.categoryColor}
              className="mt-0.5 size-9 rounded-lg border-0 text-base"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="min-w-0 flex-1 basis-32 break-words text-base font-medium leading-snug">
                  {budget.categoryName}
                </p>
                <p
                  className={cn(
                    "ml-auto flex items-center gap-1.5 text-sm font-medium",
                    BUDGET_STATUS_TEXT_CLASS[budget.status],
                  )}
                >
                  <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
                  {status.label}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                {krw.format(budget.spentKrw)} of {krw.format(budget.budgetKrw)} · {budget.usagePct}%
              </p>
              <div className="mt-2">
                <FinanceProgress
                  value={budget.usagePct}
                  label={`${budget.categoryName} budget ${budget.usagePct}% used`}
                  tone={status.tone}
                />
              </div>
            </div>
          </li>
        )
      })}
    </RowList>
  )
}
