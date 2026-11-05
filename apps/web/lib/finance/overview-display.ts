// Display-only helpers for the Finance Overview (components/finance/overview).
//
// Nothing here calculates money: every total, rate, budget and health status
// arrives already computed in FinanceOverviewSummary (server side, see
// lib/finance/financial-health.ts and the finance repositories). These turn
// those values into labels, tones and bar widths, so the components stay
// presentational and the wording is tested in one place.
import { krw } from "@/lib/finance-format"
import type {
  BudgetPerformance,
  DailyBudgetGuide,
  SavingsRateHealth,
  Transaction,
} from "@/types/finance"

export type CashFlowTone = "positive" | "negative" | "neutral"

/** "+₩1,000" for a gain, "-₩1,000" (the formatter's own sign) for a loss, "₩0" at zero. */
export function signedKrw(value: number): string {
  if (value > 0) return `+${krw.format(value)}`
  return krw.format(value)
}

/** A transaction's amount with an explicit direction: "+" income, "−" expense. */
export function transactionAmountLabel(
  transaction: Pick<Transaction, "type" | "amountKrw">,
): string {
  const prefix = transaction.type === "income" ? "+" : "−"
  return `${prefix}${krw.format(transaction.amountKrw)}`
}

export function cashFlowPosition(netKrw: number): { tone: CashFlowTone; label: string } {
  if (netKrw > 0) return { tone: "positive", label: "You kept more than you spent" }
  if (netKrw < 0) return { tone: "negative", label: "Expenses are above income" }
  return { tone: "neutral", label: "Income and expenses are balanced" }
}

export function entryCountLabel(count: number): string {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`
}

/**
 * Bar widths (0–100) for income vs. expenses, relative to the larger of the
 * two so the bigger side is always a full bar. Negative or non-finite input
 * never yields a negative or NaN width.
 */
export function flowBarWidths(
  incomeKrw: number,
  expenseKrw: number,
): {
  income: number
  expense: number
} {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)
  const income = safe(incomeKrw)
  const expense = safe(expenseKrw)
  const largest = Math.max(income, expense, 1)
  return {
    income: Math.min((income / largest) * 100, 100),
    expense: Math.min((expense / largest) * 100, 100),
  }
}

/** The savings-rate verdict line, e.g. "31.2 points above your 20% goal". */
export function savingsRateVerdict(health: SavingsRateHealth): {
  tone: "positive" | "warning" | "neutral"
  text: string
} {
  if (health.status === "unavailable") {
    return { tone: "neutral", text: "Add income to measure savings" }
  }
  const delta = health.deltaPct === null ? null : Math.abs(health.deltaPct)
  if (health.status === "below") {
    return { tone: "warning", text: `${delta} points below your ${health.targetRatePct}% goal` }
  }
  if (health.status === "on_target") {
    return { tone: "positive", text: `On your ${health.targetRatePct}% goal` }
  }
  return { tone: "positive", text: `${delta} points above your ${health.targetRatePct}% goal` }
}

export const DAILY_GUIDE_LABEL: Record<DailyBudgetGuide["status"], string> = {
  healthy: "On track",
  watch: "Spending room is tight",
  over: "Monthly budget exceeded",
}

/** Budgets at or past their watch threshold, most-used first. */
export function budgetsNeedingAttention(budgets: BudgetPerformance[]): BudgetPerformance[] {
  return budgets.filter((budget) => budget.status !== "ok").sort((a, b) => b.usagePct - a.usagePct)
}

export function attentionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "category needs" : "categories need"} attention`
}

/** "Nov 5" — the date part only; the Transactions page keeps the time. */
export function shortTransactionDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Share of the month's expenses, as a whole percent; 0 when there are none. */
export function shareOfExpenses(amountKrw: number, totalExpenseKrw: number): number {
  if (!(totalExpenseKrw > 0) || !Number.isFinite(amountKrw)) return 0
  return (amountKrw / totalExpenseKrw) * 100
}
