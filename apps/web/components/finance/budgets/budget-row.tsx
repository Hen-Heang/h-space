"use client"

import {
  AmountText,
  CategoryIcon,
  FinanceProgress,
} from "@/components/finance/ui/finance-primitives"
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status"
import { budgetRowRemainingLabel, spentOfLimitLabel } from "@/lib/finance/budgets-display"
import { cn } from "@/lib/utils"
import type { BudgetPerformance } from "@/types/finance"

/**
 * One budgeted category as a row: name and "spent of limit" on the left,
 * what's left and the status on the right, a thin bar underneath. The whole
 * row opens the editor, which also holds Remove.
 */
export function BudgetRow({
  budget,
  onOpen,
}: {
  budget: BudgetPerformance
  onOpen: (budget: BudgetPerformance) => void
}) {
  const status = BUDGET_STATUS_META[budget.status]
  const StatusIcon = status.icon
  const remaining = budgetRowRemainingLabel(budget)

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(budget)}
        aria-label={`Edit ${budget.categoryName} budget: ${spentOfLimitLabel(budget.spentKrw, budget.budgetKrw)}, ${budget.usagePct}% used, ${remaining}, ${status.label}`}
        className="flex min-h-14 w-full min-w-0 items-start gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
      >
        <CategoryIcon
          icon={budget.categoryIcon}
          color={budget.categoryColor}
          className="mt-0.5 size-9 rounded-lg border-0 text-base"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 flex-1 break-words text-base font-medium leading-snug">
              {budget.categoryName}
            </span>
            <span
              className={cn(
                // Capped so a huge figure wraps between digit groups instead
                // of squeezing the name to nothing.
                "max-w-[55%] shrink-0 text-right text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] tabular-nums",
                budget.overBudget ? "text-destructive" : "text-foreground",
              )}
            >
              <AmountText value={remaining} />
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground tabular-nums">
              {spentOfLimitLabel(budget.spentKrw, budget.budgetKrw)} · {budget.usagePct}%
            </span>
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 font-medium",
                BUDGET_STATUS_TEXT_CLASS[budget.status],
              )}
            >
              <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {status.label}
            </span>
          </span>
          <span className="mt-2 block">
            <FinanceProgress
              value={budget.usagePct}
              label={`${budget.categoryName} budget ${budget.usagePct}% used`}
              tone={status.tone}
            />
          </span>
        </span>
      </button>
    </li>
  )
}
