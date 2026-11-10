import { describe, expect, it } from "vitest"

import {
  categoryChangeLabel,
  reviewLede,
  savingsGoalsLabel,
  topCategoryChanges,
} from "./review-display"
import type { BudgetPerformance, MonthTotals } from "@/types/finance"

function totals(overrides: Partial<MonthTotals> = {}): MonthTotals {
  return {
    totalIncomeKrw: 3_600_000,
    totalExpenseKrw: 1_757_500,
    netCashFlowKrw: 1_842_500,
    savingsRatePct: 51.2,
    transactionCount: 42,
    incomeTransactionCount: 2,
    expenseTransactionCount: 40,
    ...overrides,
  }
}

function budget(status: BudgetPerformance["status"]): BudgetPerformance {
  return {
    categoryId: status,
    categoryName: status,
    categoryIcon: null,
    categoryColor: null,
    budgetKrw: 100_000,
    spentKrw: 50_000,
    remainingKrw: 50_000,
    usagePct: 50,
    overBudget: status === "exceeded",
    status,
  }
}

const labels = { monthLabel: "October 2026", previousMonthLabel: "September 2026" }

describe("reviewLede", () => {
  it("states income, spending, what was kept and the savings rate", () => {
    const lede = reviewLede({
      totals: totals(),
      previousTotals: totals({ totalExpenseKrw: 2_000_000 }),
      budgets: [budget("ok"), budget("watch")],
      ...labels,
    })
    expect(lede.headline).toBe(
      "In October 2026 you earned ₩3,600,000 and spent ₩1,757,500, keeping ₩1,842,500 — 51.2% of your income.",
    )
    expect(lede.details).toEqual([
      "Spending was 12% lower than in September 2026.",
      "All 2 budgets stayed within their limits.",
    ])
  })

  it("names an overspend and over-budget categories", () => {
    const lede = reviewLede({
      totals: totals({
        totalIncomeKrw: 1_000_000,
        totalExpenseKrw: 1_250_000,
        netCashFlowKrw: -250_000,
      }),
      previousTotals: totals({ totalExpenseKrw: 1_000_000 }),
      budgets: [budget("exceeded"), budget("ok"), budget("near_limit")],
      ...labels,
    })
    expect(lede.headline).toBe(
      "In October 2026 you earned ₩1,000,000 and spent ₩1,250,000 — ₩250,000 more than came in.",
    )
    expect(lede.details).toEqual([
      "Spending was 25% higher than in September 2026.",
      "1 of 3 budgets went over.",
    ])
  })

  it("handles no income, break-even, and nothing to compare", () => {
    expect(
      reviewLede({
        totals: totals({ totalIncomeKrw: 0, totalExpenseKrw: 9_000, netCashFlowKrw: -9_000 }),
        previousTotals: totals({ totalExpenseKrw: 0 }),
        budgets: [],
        ...labels,
      }),
    ).toEqual({ headline: "In October 2026 you spent ₩9,000 and recorded no income.", details: [] })

    const even = reviewLede({
      totals: totals({ totalIncomeKrw: 500, totalExpenseKrw: 500, netCashFlowKrw: 0 }),
      previousTotals: totals({ totalExpenseKrw: 500 }),
      budgets: [budget("ok")],
      ...labels,
    })
    expect(even.headline).toMatch(/breaking even\.$/)
    expect(even.details).toEqual([
      "Spending matched September 2026.",
      "Your budget stayed within its limit.",
    ])
  })

  it("keeps huge amounts intact", () => {
    const lede = reviewLede({
      totals: totals({
        totalIncomeKrw: 987_654_321_000,
        totalExpenseKrw: 1,
        netCashFlowKrw: 987_654_320_999,
      }),
      previousTotals: totals(),
      budgets: [],
      ...labels,
    })
    expect(lede.headline).toContain("₩987,654,321,000")
  })
})

describe("topCategoryChanges", () => {
  it("orders by the size of the swing and caps the list", () => {
    const entry = (name: string, deltaKrw: number) => ({
      categoryId: name,
      categoryName: name,
      currentKrw: 0,
      previousKrw: 0,
      deltaKrw,
    })
    const result = topCategoryChanges([entry("a", 10), entry("b", -50), entry("c", 30)], 2)
    expect(result.map((change) => change.categoryName)).toEqual(["b", "c"])
  })
})

describe("categoryChangeLabel", () => {
  it("says the direction in words", () => {
    expect(categoryChangeLabel(12_000)).toBe("₩12,000 more")
    expect(categoryChangeLabel(-5_000)).toBe("₩5,000 less")
    expect(categoryChangeLabel(0)).toBe("No change")
  })
})

describe("savingsGoalsLabel", () => {
  it("counts goals and reached goals", () => {
    const progress = {
      totalSavedUsd: 0,
      totalTargetUsd: 0,
      overallPct: 0,
      goalsCount: 1,
      goalsReachedCount: 0,
    }
    expect(savingsGoalsLabel(progress)).toBe("1 goal")
    expect(savingsGoalsLabel({ ...progress, goalsCount: 3, goalsReachedCount: 1 })).toBe(
      "3 goals · 1 reached",
    )
  })
})
