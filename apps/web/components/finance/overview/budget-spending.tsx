import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  AmountText,
  CategoryIcon,
  FinanceProgress,
  FinanceSection,
} from "@/components/finance/ui/finance-primitives"
import { BUDGET_STATUS_META, BUDGET_STATUS_TEXT_CLASS } from "@/components/finance/ui/budget-status"
import { krw } from "@/lib/finance-format"
import {
  attentionCountLabel,
  DAILY_GUIDE_LABEL,
  shareOfExpenses,
} from "@/lib/finance/overview-display"
import { cn } from "@/lib/utils"
import type {
  BudgetHealth,
  BudgetPerformance,
  CategoryAmount,
  DailyBudgetGuide,
} from "@/types/finance"

const TOP_CATEGORIES = 6

const GUIDE_TONE_CLASS: Record<DailyBudgetGuide["status"], string> = {
  healthy: "text-success",
  watch: "text-warning",
  over: "text-destructive",
}

/**
 * Budget and spending in one surface: how much of the month's budget is left,
 * the daily guide, then where the money went by category. Replaces the
 * separate Budget tile, Daily budget card and Spending list.
 */
export function BudgetSpending({
  budgetHealth,
  dailyBudget,
  categories,
  budgets,
  totalExpenseKrw,
  isCurrentMonth,
}: {
  budgetHealth: BudgetHealth | null
  dailyBudget: DailyBudgetGuide | null
  categories: CategoryAmount[]
  budgets: BudgetPerformance[]
  totalExpenseKrw: number
  isCurrentMonth: boolean
}) {
  return (
    <FinanceSection
      id="finance-budget"
      title="Budget and spending"
      action={
        <Link
          href="/finance/budgets"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Budgets <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      }
    >
      <div className="app-surface min-w-0 overflow-hidden">
        {budgetHealth ? (
          <BudgetHeadline health={budgetHealth} />
        ) : (
          <div className="px-4 py-4 sm:px-6">
            <p className="text-base font-medium">No category budgets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCurrentMonth
                ? "Set category budgets to see what's left and unlock your daily spending guide."
                : "No budgets were set for this month."}
            </p>
            {isCurrentMonth && (
              <Link
                href="/finance/budgets"
                className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Set category budgets <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {dailyBudget ? (
          <DailyGuide guide={dailyBudget} />
        ) : budgetHealth && !isCurrentMonth ? (
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6">
            The daily spending guide covers the current month only.
          </p>
        ) : null}

        <CategoryRows categories={categories} budgets={budgets} totalExpenseKrw={totalExpenseKrw} />
      </div>
    </FinanceSection>
  )
}

function BudgetHeadline({ health }: { health: BudgetHealth }) {
  const status = BUDGET_STATUS_META[health.status]
  const StatusIcon = status.icon
  const left =
    health.remainingKrw >= 0
      ? `${krw.format(health.remainingKrw)} left`
      : `${krw.format(Math.abs(health.remainingKrw))} over`
  const statusText =
    health.attentionCount === 0 ? status.label : attentionCountLabel(health.attentionCount)
  const statusClass = cn(
    "inline-flex min-h-6 items-center gap-1.5 text-sm font-medium",
    BUDGET_STATUS_TEXT_CLASS[health.status],
  )

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          className={cn(
            "[overflow-wrap:anywhere] text-xl font-semibold tracking-tight tabular-nums",
            health.status === "exceeded" && "text-destructive",
          )}
        >
          <AmountText value={left} />
        </p>
        {health.attentionCount > 0 ? (
          <a
            href="#finance-attention"
            className={cn(statusClass, "underline-offset-4 hover:underline")}
          >
            <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
            {statusText}
          </a>
        ) : (
          <p className={statusClass}>
            <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
            {statusText}
          </p>
        )}
      </div>
      <div className="mt-3">
        <FinanceProgress
          value={health.usagePct}
          label={`Budget ${health.usagePct} percent used`}
          tone={status.tone}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground tabular-nums">
        {krw.format(health.totalSpentKrw)} of {krw.format(health.totalBudgetKrw)} used ·{" "}
        {health.usagePct}%
      </p>
    </div>
  )
}

function DailyGuide({ guide }: { guide: DailyBudgetGuide }) {
  return (
    <div className="border-t border-border px-4 py-4 sm:px-6">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium text-foreground">Daily guide</span>
        <span className={cn("font-medium", GUIDE_TONE_CLASS[guide.status])}>
          {DAILY_GUIDE_LABEL[guide.status]}
        </span>
        <span className="text-muted-foreground">· {guide.daysRemaining} days including today</span>
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 xs:grid-cols-3">
        <GuideFigure label="Per day" value={krw.format(guide.availablePerDayKrw)} />
        <GuideFigure label="Spent today" value={krw.format(guide.spentTodayKrw)} />
        <GuideFigure label="Remaining" value={krw.format(guide.monthlyRemainingKrw)} />
      </dl>
    </div>
  )
}

function GuideFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className="mt-0.5 [overflow-wrap:anywhere] text-base font-semibold tracking-tight tabular-nums"
        title={value}
      >
        <AmountText value={value} />
      </dd>
    </div>
  )
}

function CategoryRows({
  categories,
  budgets,
  totalExpenseKrw,
}: {
  categories: CategoryAmount[]
  budgets: BudgetPerformance[]
  totalExpenseKrw: number
}) {
  if (categories.length === 0) {
    return (
      <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6">
        Spending by category appears here as you add expenses.
      </p>
    )
  }

  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget]))
  const shown = categories.slice(0, TOP_CATEGORIES)

  return (
    <div className="border-t border-border">
      <h3 className="px-4 pt-4 text-sm font-medium text-muted-foreground sm:px-6">
        Spending by category
      </h3>
      <ul className="divide-y divide-border">
        {shown.map((category) => {
          const share = shareOfExpenses(category.amountKrw, totalExpenseKrw)
          const budget = category.categoryId ? budgetByCategory.get(category.categoryId) : undefined
          return (
            <li key={category.categoryId ?? category.categoryName} className="px-4 py-3 sm:px-6">
              <div className="flex items-start gap-3">
                <CategoryIcon
                  icon={category.categoryIcon}
                  color={category.categoryColor}
                  className="mt-0.5 size-9 rounded-lg border-0 text-base"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="min-w-0 flex-1 basis-32 break-words text-base font-medium leading-snug">
                      {category.categoryName}
                    </p>
                    <p className="ml-auto text-base font-semibold tracking-tight whitespace-nowrap tabular-nums">
                      <AmountText value={krw.format(category.amountKrw)} />
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {share.toFixed(0)}% of expenses
                    {budget ? (
                      <>
                        {" · "}
                        <span
                          className={cn(
                            budget.status !== "ok" && BUDGET_STATUS_TEXT_CLASS[budget.status],
                          )}
                        >
                          {budget.usagePct}% of budget
                        </span>
                      </>
                    ) : (
                      " · No budget"
                    )}
                  </p>
                  <div className="mt-2">
                    <FinanceProgress
                      value={share}
                      label={`${category.categoryName} is ${share.toFixed(0)}% of expenses`}
                      color={category.categoryColor}
                    />
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {categories.length > TOP_CATEGORIES && (
        <Link
          href="/finance/analytics"
          className="flex min-h-11 items-center justify-between gap-2 border-t border-border px-4 text-sm font-medium text-primary hover:bg-accent/60 sm:px-6"
        >
          All {categories.length} categories in Analytics
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
