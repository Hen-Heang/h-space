import { describe, expect, it } from "vitest"

import {
  budgetAttentionLabel,
  budgetCountLabel,
  budgetLeftLabel,
  budgetRowRemainingLabel,
  budgetTotals,
  spentOfLimitLabel,
} from "./budgets-display"
import type { BudgetPerformance } from "@/types/finance"

function budget(
  categoryId: string,
  budgetKrw: number,
  spentKrw: number,
  status: BudgetPerformance["status"] = "ok",
): BudgetPerformance {
  return {
    categoryId,
    categoryName: categoryId,
    categoryIcon: null,
    categoryColor: null,
    budgetKrw,
    spentKrw,
    remainingKrw: budgetKrw - spentKrw,
    usagePct: Math.round((spentKrw / budgetKrw) * 100),
    overBudget: spentKrw > budgetKrw,
    status,
  }
}

describe("budgetTotals", () => {
  it("is all zeros for no budgets", () => {
    expect(budgetTotals([])).toEqual({
      count: 0,
      totalBudgetKrw: 0,
      totalSpentKrw: 0,
      remainingKrw: 0,
      attentionCount: 0,
    })
  })

  it("sums limits and spending and counts every non-ok status", () => {
    const totals = budgetTotals([
      budget("food", 300_000, 120_000),
      budget("fun", 100_000, 85_000, "near_limit"),
      budget("taxi", 50_000, 70_000, "exceeded"),
      budget("cafe", 40_000, 30_000, "watch"),
    ])
    expect(totals).toEqual({
      count: 4,
      totalBudgetKrw: 490_000,
      totalSpentKrw: 305_000,
      remainingKrw: 185_000,
      attentionCount: 3,
    })
  })

  it("goes negative when total spending passes the total limit", () => {
    expect(budgetTotals([budget("taxi", 50_000, 987_654_321_000, "exceeded")]).remainingKrw).toBe(
      50_000 - 987_654_321_000,
    )
  })
})

describe("labels", () => {
  it("says left or over, never a negative amount", () => {
    expect(budgetLeftLabel(12_000)).toBe("₩12,000 left")
    expect(budgetLeftLabel(0)).toBe("₩0 left")
    expect(budgetLeftLabel(-3_000)).toBe("₩3,000 over")
  })

  it("uses the server's overBudget flag for a row", () => {
    expect(budgetRowRemainingLabel({ overBudget: false, remainingKrw: 5_000 })).toBe("₩5,000 left")
    expect(budgetRowRemainingLabel({ overBudget: true, remainingKrw: -20_000 })).toBe(
      "₩20,000 over",
    )
  })

  it("formats spent of limit", () => {
    expect(spentOfLimitLabel(8_000, 20_000)).toBe("₩8,000 of ₩20,000")
  })

  it("pluralises categories and attention", () => {
    expect(budgetCountLabel(1)).toBe("1 category")
    expect(budgetCountLabel(3)).toBe("3 categories")
    expect(budgetAttentionLabel(0)).toBe("All budgets healthy")
    expect(budgetAttentionLabel(1)).toBe("1 category needs attention")
    expect(budgetAttentionLabel(2)).toBe("2 categories need attention")
  })
})
