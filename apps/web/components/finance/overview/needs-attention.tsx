import Link from "next/link"
import { ChevronRight, Tags, Wallet } from "lucide-react"

import {
  CategoryIcon,
  FinanceProgress,
  FinanceSection,
} from "@/components/finance/ui/finance-primitives"
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status"
import { krw } from "@/lib/finance-format"
import { budgetsNeedingAttention } from "@/lib/finance/overview-display"
import { cn } from "@/lib/utils"
import type { BudgetPerformance } from "@/types/finance"

const ROW =
  "flex min-h-14 w-full min-w-0 items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"

/**
 * Only what needs a decision: budgets at or past their watch threshold,
 * spending that isn't classified yet, and a month with no income logged.
 * Renders nothing when all is well — the budget headline already says
 * "Healthy", so there's no "No alerts" filler.
 */
export function NeedsAttention({
  budgets,
  unclassifiedKrw,
  missingIncome,
}: {
  budgets: BudgetPerformance[]
  unclassifiedKrw: number
  missingIncome: boolean
}) {
  const alerts = budgetsNeedingAttention(budgets)
  if (alerts.length === 0 && unclassifiedKrw <= 0 && !missingIncome) return null

  return (
    <FinanceSection id="finance-attention" title="Needs attention">
      <ul className="app-surface divide-y divide-border overflow-hidden">
        {alerts.map((budget) => {
          const status = BUDGET_STATUS_META[budget.status]
          const StatusIcon = status.icon
          return (
            <li key={budget.categoryId}>
              <Link href="/finance/budgets" className={ROW}>
                <CategoryIcon
                  icon={budget.categoryIcon}
                  color={budget.categoryColor}
                  className="mt-0.5 size-9 rounded-lg border-0 text-base"
                />
                <div className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="min-w-0 break-words text-base font-medium">
                      {budget.categoryName}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-sm font-medium",
                        BUDGET_STATUS_TEXT_CLASS[budget.status],
                      )}
                    >
                      <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
                      {status.label} · {budget.usagePct}%
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground tabular-nums">
                    {krw.format(budget.spentKrw)} of {krw.format(budget.budgetKrw)}
                  </span>
                  <div className="mt-2">
                    <FinanceProgress
                      value={budget.usagePct}
                      label={`${budget.categoryName} budget ${budget.usagePct}% used`}
                      tone={status.tone}
                    />
                  </div>
                </div>
              </Link>
            </li>
          )
        })}

        {unclassifiedKrw > 0 && (
          <li>
            <Link href="/finance/settings#settings-categories" className={ROW}>
              <Tags className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium tabular-nums">
                  {krw.format(unclassifiedKrw)} isn&rsquo;t classified yet
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Classify categories to complete your Essentials, Lifestyle and Future picture.
                </span>
              </span>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        )}

        {missingIncome && (
          <li>
            <Link href="/finance/transactions" className={ROW}>
              <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium">No income logged this month</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Add your income to compare it with your Essentials, Lifestyle and Future
                  guidelines.
                </span>
              </span>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        )}
      </ul>
    </FinanceSection>
  )
}
