// Display-only helpers for the Budgets page (components/finance/budgets).
//
// Every per-budget figure (spent, remaining, usage %, status) arrives
// computed in BudgetPerformance. These only total what is already on screen
// and turn it into labels, so the wording is tested in one place.
import { krw } from "@/lib/finance-format"
import { attentionCountLabel } from "@/lib/finance/overview-display"
import type { BudgetPerformance } from "@/types/finance"

export type BudgetTotals = {
  count: number
  totalBudgetKrw: number
  totalSpentKrw: number
  remainingKrw: number
  attentionCount: number
}

/** The page summary: the same four figures the old summary tiles showed. */
export function budgetTotals(performance: BudgetPerformance[]): BudgetTotals {
  const totalBudgetKrw = performance.reduce((sum, budget) => sum + budget.budgetKrw, 0)
  const totalSpentKrw = performance.reduce((sum, budget) => sum + budget.spentKrw, 0)
  return {
    count: performance.length,
    totalBudgetKrw,
    totalSpentKrw,
    remainingKrw: totalBudgetKrw - totalSpentKrw,
    attentionCount: performance.filter((budget) => budget.status !== "ok").length,
  }
}

/** "₩12,000 left", or "₩3,000 over" when the amount is negative. */
export function budgetLeftLabel(remainingKrw: number): string {
  return remainingKrw < 0
    ? `${krw.format(Math.abs(remainingKrw))} over`
    : `${krw.format(remainingKrw)} left`
}

/** A row's trailing figure; uses the server's `overBudget` flag like the old card. */
export function budgetRowRemainingLabel(
  budget: Pick<BudgetPerformance, "overBudget" | "remainingKrw">,
): string {
  return budget.overBudget
    ? `${krw.format(Math.abs(budget.remainingKrw))} over`
    : `${krw.format(budget.remainingKrw)} left`
}

/** "₩8,000 of ₩20,000" */
export function spentOfLimitLabel(spentKrw: number, limitKrw: number): string {
  return `${krw.format(spentKrw)} of ${krw.format(limitKrw)}`
}

export function budgetCountLabel(count: number): string {
  return `${count} ${count === 1 ? "category" : "categories"}`
}

/** "All budgets healthy", or "2 categories need attention". */
export function budgetAttentionLabel(attentionCount: number): string {
  return attentionCount > 0 ? attentionCountLabel(attentionCount) : "All budgets healthy"
}
