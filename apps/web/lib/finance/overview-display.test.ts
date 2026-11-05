import { describe, expect, it } from "vitest"

import {
  attentionCountLabel,
  budgetsNeedingAttention,
  cashFlowPosition,
  entryCountLabel,
  flowBarWidths,
  savingsRateVerdict,
  shareOfExpenses,
  shortTransactionDate,
  signedKrw,
  transactionAmountLabel,
} from "./overview-display"
import type { BudgetPerformance } from "@/types/finance"

function budget(
  categoryId: string,
  status: BudgetPerformance["status"],
  usagePct: number,
): BudgetPerformance {
  return {
    categoryId,
    categoryName: categoryId,
    categoryIcon: null,
    categoryColor: null,
    budgetKrw: 100_000,
    spentKrw: usagePct * 1_000,
    remainingKrw: 100_000 - usagePct * 1_000,
    usagePct,
    overBudget: usagePct > 100,
    status,
  }
}

describe("signedKrw", () => {
  it("marks gains with a plus and keeps the formatter's minus for losses", () => {
    expect(signedKrw(1_842_500)).toBe("+₩1,842,500")
    expect(signedKrw(-50_000)).toMatch(/^-₩50,000$/)
    expect(signedKrw(0)).toBe("₩0")
  })

  it("formats very large amounts without losing digits", () => {
    expect(signedKrw(987_654_321_000)).toBe("+₩987,654,321,000")
  })
})

describe("transactionAmountLabel", () => {
  it("prefixes income with + and expenses with a true minus sign", () => {
    expect(transactionAmountLabel({ type: "income", amountKrw: 3_200_000 })).toBe("+₩3,200,000")
    expect(transactionAmountLabel({ type: "expense", amountKrw: 84_300 })).toBe("−₩84,300")
  })
})

describe("cashFlowPosition", () => {
  it("reads the sign of the month's net", () => {
    expect(cashFlowPosition(1).tone).toBe("positive")
    expect(cashFlowPosition(-1)).toEqual({ tone: "negative", label: "Expenses are above income" })
    expect(cashFlowPosition(0).tone).toBe("neutral")
  })
})

describe("entryCountLabel", () => {
  it("pluralises", () => {
    expect(entryCountLabel(1)).toBe("1 transaction")
    expect(entryCountLabel(0)).toBe("0 transactions")
    expect(entryCountLabel(7)).toBe("7 transactions")
  })
})

describe("flowBarWidths", () => {
  it("makes the larger side a full bar", () => {
    expect(flowBarWidths(3_600_000, 1_800_000)).toEqual({ income: 100, expense: 50 })
    expect(flowBarWidths(0, 500)).toEqual({ income: 0, expense: 100 })
  })

  it("never returns negative or NaN widths", () => {
    expect(flowBarWidths(0, 0)).toEqual({ income: 0, expense: 0 })
    expect(flowBarWidths(-10, Number.NaN)).toEqual({ income: 0, expense: 0 })
  })
})

describe("savingsRateVerdict", () => {
  it("describes each status against the goal", () => {
    expect(savingsRateVerdict({ targetRatePct: 20, deltaPct: 31.2, status: "above" })).toEqual({
      tone: "positive",
      text: "31.2 points above your 20% goal",
    })
    expect(savingsRateVerdict({ targetRatePct: 20, deltaPct: -5, status: "below" })).toEqual({
      tone: "warning",
      text: "5 points below your 20% goal",
    })
    expect(savingsRateVerdict({ targetRatePct: 20, deltaPct: 0, status: "on_target" }).text).toBe(
      "On your 20% goal",
    )
    expect(
      savingsRateVerdict({ targetRatePct: 20, deltaPct: null, status: "unavailable" }),
    ).toEqual({ tone: "neutral", text: "Add income to measure savings" })
  })
})

describe("budgetsNeedingAttention", () => {
  it("keeps only non-ok budgets, most-used first, without mutating the input", () => {
    const input = [budget("a", "ok", 40), budget("b", "watch", 82), budget("c", "exceeded", 102)]
    expect(budgetsNeedingAttention(input).map((b) => b.categoryId)).toEqual(["c", "b"])
    expect(input.map((b) => b.categoryId)).toEqual(["a", "b", "c"])
  })

  it("is empty when every budget is healthy", () => {
    expect(budgetsNeedingAttention([budget("a", "ok", 10)])).toEqual([])
  })
})

describe("attentionCountLabel", () => {
  it("agrees in number", () => {
    expect(attentionCountLabel(1)).toBe("1 category needs attention")
    expect(attentionCountLabel(2)).toBe("2 categories need attention")
  })
})

describe("shortTransactionDate", () => {
  it("shows month and day only", () => {
    expect(shortTransactionDate("2026-11-05")).toBe("Nov 5")
  })

  it("falls back to the raw value when it can't parse", () => {
    expect(shortTransactionDate("not-a-date")).toBe("not-a-date")
  })
})

describe("shareOfExpenses", () => {
  it("is a percentage of the month's expenses", () => {
    expect(shareOfExpenses(25, 100)).toBe(25)
  })

  it("is 0 when there are no expenses or the amount is invalid", () => {
    expect(shareOfExpenses(50, 0)).toBe(0)
    expect(shareOfExpenses(Number.NaN, 100)).toBe(0)
  })
})
