// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ReviewLede } from "./review-summary"
import { ReviewSavingsAndSubscriptions } from "./review-savings-progress"
import { ReviewCategoryChanges } from "./review-category-changes"
import type { MonthTotals, ReviewSummary } from "@/types/finance"

afterEach(cleanup)

function totals(overrides: Partial<MonthTotals> = {}): MonthTotals {
  return {
    totalIncomeKrw: 2_000_000,
    totalExpenseKrw: 1_500_000,
    netCashFlowKrw: 500_000,
    savingsRatePct: 25,
    transactionCount: 9,
    incomeTransactionCount: 1,
    expenseTransactionCount: 8,
    ...overrides,
  }
}

const progress = {
  totalSavedUsd: 1_200,
  totalTargetUsd: 4_000,
  overallPct: 30,
  goalsCount: 2,
  goalsReachedCount: 0,
}

function summary(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
  return {
    month: "2026-10",
    totals: totals(),
    previousTotals: totals({ totalExpenseKrw: 1_000_000 }),
    categoryComparison: [],
    budgetPerformance: [],
    subscriptionsMonthlyKrw: 45_000,
    savingsProgress: progress,
    observations: [],
    nextMonthPlan: null,
    ...overrides,
  }
}

describe("ReviewLede", () => {
  it("tells the month in words instead of KPI tiles", () => {
    render(
      <ReviewLede
        summary={summary()}
        monthLabel="October 2026"
        previousMonthLabel="September 2026"
        planLabel={null}
      />,
    )
    expect(screen.getByTestId("review-lede").textContent).toBe(
      "In October 2026 you earned ₩2,000,000 and spent ₩1,500,000, keeping ₩500,000 — 25% of your income.",
    )
    expect(screen.getByText("Spending was 50% higher than in September 2026.")).toBeTruthy()
    expect(screen.getByText("From 9 transactions")).toBeTruthy()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("links down to next month's plan when there is one", () => {
    render(
      <ReviewLede
        summary={summary()}
        monthLabel="October 2026"
        previousMonthLabel="September 2026"
        planLabel="November 2026"
      />,
    )
    expect(screen.getByRole("link", { name: "Plan for November 2026" }).getAttribute("href")).toBe(
      "#review-next-month-plan",
    )
  })
})

describe("ReviewSavingsAndSubscriptions", () => {
  it("is two rows that open Savings and Subscriptions, keeping the anchor id", () => {
    const { container } = render(
      <ReviewSavingsAndSubscriptions
        progress={progress}
        subscriptionsMonthlyKrw={45_000}
        subscriptionsId="review-subscriptions"
      />,
    )
    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/finance/savings",
      "/finance/subscriptions",
    ])
    expect(links[0]!.textContent).toContain("2 goals")
    expect(container.querySelector("#review-subscriptions")).not.toBeNull()
  })

  it("explains an empty savings state in the row", () => {
    render(
      <ReviewSavingsAndSubscriptions
        progress={{ ...progress, goalsCount: 0 }}
        subscriptionsMonthlyKrw={0}
      />,
    )
    expect(screen.getByText(/No savings goals yet/)).toBeTruthy()
    expect(screen.queryByRole("progressbar")).toBeNull()
  })
})

describe("ReviewCategoryChanges", () => {
  it("states each change's direction in words", () => {
    render(
      <ReviewCategoryChanges
        categoryComparison={[
          {
            categoryId: "a",
            categoryName: "Groceries",
            currentKrw: 0,
            previousKrw: 0,
            deltaKrw: -12_000,
          },
          {
            categoryId: "b",
            categoryName: "Transport",
            currentKrw: 0,
            previousKrw: 0,
            deltaKrw: 0,
          },
        ]}
      />,
    )
    const rows = screen.getAllByRole("listitem")
    expect(rows[0]!.textContent).toContain("₩12,000 less")
    expect(rows[1]!.textContent).toContain("No change")
  })
})
