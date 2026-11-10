// Display-only helpers for the Finance Monthly Review (components/finance/review).
//
// Every number arrives computed in ReviewSummary (server side). These compose
// those numbers into the review's short narrative and row labels, so the
// wording is tested in one place and the components stay presentational.
import { krw } from "@/lib/finance-format"
import type {
  BudgetPerformance,
  CategoryComparison,
  MonthTotals,
  SavingsProgress,
} from "@/types/finance"

export interface ReviewLede {
  /** The one-sentence headline: what came in, what went out, what was kept. */
  headline: string
  /** Supporting sentences: the month-over-month change and how budgets held. */
  details: string[]
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function headlineFor(totals: MonthTotals, monthLabel: string): string {
  const income = finite(totals.totalIncomeKrw)
  const expense = finite(totals.totalExpenseKrw)
  const net = finite(totals.netCashFlowKrw)
  if (income <= 0) {
    return `In ${monthLabel} you spent ${krw.format(expense)} and recorded no income.`
  }
  const flows = `In ${monthLabel} you earned ${krw.format(income)} and spent ${krw.format(expense)}`
  if (net > 0) {
    return `${flows}, keeping ${krw.format(net)} — ${totals.savingsRatePct}% of your income.`
  }
  if (net < 0) return `${flows} — ${krw.format(Math.abs(net))} more than came in.`
  return `${flows}, breaking even.`
}

function spendingChange(
  totals: MonthTotals,
  previousTotals: MonthTotals,
  previousMonthLabel: string,
): string | null {
  const now = finite(totals.totalExpenseKrw)
  const before = finite(previousTotals.totalExpenseKrw)
  if (before <= 0) return null
  if (now === before) return `Spending matched ${previousMonthLabel}.`
  const pct = Math.round((Math.abs(now - before) / before) * 100)
  if (pct === 0) return `Spending was about the same as in ${previousMonthLabel}.`
  return `Spending was ${pct}% ${now > before ? "higher" : "lower"} than in ${previousMonthLabel}.`
}

function budgetSentence(budgets: BudgetPerformance[]): string | null {
  if (budgets.length === 0) return null
  const over = budgets.filter((budget) => budget.status === "exceeded").length
  if (over === 0) {
    return budgets.length === 1
      ? "Your budget stayed within its limit."
      : `All ${budgets.length} budgets stayed within their limits.`
  }
  return `${over} of ${budgets.length} ${budgets.length === 1 ? "budget" : "budgets"} went over.`
}

/**
 * The Review's narrative lede, built from numbers the server already
 * computed. It replaces the four KPI tiles (which duplicated Analytics):
 * income, spending, net and savings rate are all still stated, in words.
 */
export function reviewLede({
  totals,
  previousTotals,
  budgets,
  monthLabel,
  previousMonthLabel,
}: {
  totals: MonthTotals
  previousTotals: MonthTotals
  budgets: BudgetPerformance[]
  monthLabel: string
  previousMonthLabel: string
}): ReviewLede {
  const details = [
    spendingChange(totals, previousTotals, previousMonthLabel),
    budgetSentence(budgets),
  ].filter((sentence): sentence is string => sentence !== null)
  return { headline: headlineFor(totals, monthLabel), details }
}

/** The largest category swings first, capped at `limit` (the review shows eight). */
export function topCategoryChanges(
  comparison: CategoryComparison[],
  limit = 8,
): CategoryComparison[] {
  return [...comparison]
    .sort((a, b) => Math.abs(finite(b.deltaKrw)) - Math.abs(finite(a.deltaKrw)))
    .slice(0, limit)
}

/** "₩12,000 more", "₩5,000 less" or "No change" — direction in words, not colour alone. */
export function categoryChangeLabel(deltaKrw: number): string {
  const delta = finite(deltaKrw)
  if (delta === 0) return "No change"
  return `${krw.format(Math.abs(delta))} ${delta > 0 ? "more" : "less"}`
}

/** "3 goals · 1 reached". */
export function savingsGoalsLabel(progress: SavingsProgress): string {
  const goals = `${progress.goalsCount} ${progress.goalsCount === 1 ? "goal" : "goals"}`
  return progress.goalsReachedCount > 0 ? `${goals} · ${progress.goalsReachedCount} reached` : goals
}
