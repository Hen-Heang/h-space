// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AnalyticsSummary } from "./analytics-summary"
import { CashFlowTrendChart } from "./cash-flow-trend-chart"
import { PaymentMethodBreakdown } from "./payment-method-breakdown"
import type { DailyFlowPoint, MonthTotals } from "@/types/finance"

afterEach(cleanup)

function totals(overrides: Partial<MonthTotals> = {}): MonthTotals {
  return {
    totalIncomeKrw: 3_000_000,
    totalExpenseKrw: 1_000_000,
    netCashFlowKrw: 2_000_000,
    savingsRatePct: 66.7,
    transactionCount: 12,
    incomeTransactionCount: 1,
    expenseTransactionCount: 11,
    ...overrides,
  }
}

describe("AnalyticsSummary", () => {
  it("shows each figure once with its change since last month, in words", () => {
    const { container } = render(
      <AnalyticsSummary
        totals={totals()}
        previousTotals={totals({
          totalIncomeKrw: 3_000_000,
          totalExpenseKrw: 1_250_000,
          netCashFlowKrw: 1_750_000,
          savingsRatePct: 58.3,
        })}
      />,
    )
    const list = container.querySelector("dl")!
    expect(
      within(list)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Income", "Expenses", "Net cash flow", "Savings rate"])
    expect(list.textContent).toContain("No change vs last month")
    expect(list.textContent).toContain("Down 20% vs last month")
    expect(list.textContent).toContain("Up 8.4 pts vs last month")
    expect(list.textContent).toContain("₩1,250,000 last month")
    // The old Month comparison anchor still exists.
    expect(list.id).toBe("analytics-comparison")
  })

  it("asks for income instead of a savings-rate change when there is none", () => {
    render(
      <AnalyticsSummary
        totals={totals({ totalIncomeKrw: 0, savingsRatePct: 0, netCashFlowKrw: -1_000_000 })}
        previousTotals={totals()}
      />,
    )
    expect(screen.getByText("Add income to calculate")).toBeTruthy()
  })
})

describe("CashFlowTrendChart", () => {
  const data: DailyFlowPoint[] = [
    { date: "2026-11-01", incomeKrw: 0, expenseKrw: 10_000 },
    { date: "2026-11-02", incomeKrw: 3_000_000, expenseKrw: 0 },
    { date: "2026-11-03", incomeKrw: 0, expenseKrw: 25_000 },
    { date: "2026-11-04", incomeKrw: 0, expenseKrw: 0 },
  ]

  it("opens on the latest day with activity and moves by keyboard", () => {
    render(<CashFlowTrendChart data={data} />)
    const slider = screen.getByRole("slider")
    expect(slider.getAttribute("tabindex")).toBe("0")
    expect(slider.getAttribute("aria-valuenow")).toBe("3")
    expect(slider.getAttribute("aria-valuetext")).toBe("Nov 3: income ₩0, expenses ₩25,000")
    expect(screen.getByTestId("trend-readout").textContent).toContain("Nov 3")

    fireEvent.keyDown(slider, { key: "ArrowLeft" })
    expect(slider.getAttribute("aria-valuetext")).toBe("Nov 2: income ₩3,000,000, expenses ₩0")
    expect(screen.getByTestId("trend-readout").textContent).toContain("₩3,000,000")

    fireEvent.keyDown(slider, { key: "End" })
    expect(slider.getAttribute("aria-valuenow")).toBe("4")
    fireEvent.keyDown(slider, { key: "Home" })
    expect(slider.getAttribute("aria-valuenow")).toBe("1")
  })

  it("has a plain message instead of an empty plot", () => {
    render(<CashFlowTrendChart data={[]} />)
    expect(screen.queryByRole("slider")).toBeNull()
    expect(screen.getByText("No daily figures for this month yet.")).toBeTruthy()
  })
})

describe("PaymentMethodBreakdown", () => {
  it("ranks methods with written shares and folds the rest into Other", () => {
    const methods = Array.from({ length: 8 }, (_, index) => ({
      paymentMethodId: `m${index}`,
      paymentMethodName: `Method ${index}`,
      amountKrw: (index + 1) * 1_000,
    }))
    render(<PaymentMethodBreakdown paymentMethods={methods} />)
    const rows = screen.getAllByRole("listitem")
    expect(rows).toHaveLength(7)
    expect(rows[0]!.textContent).toContain("Method 7")
    expect(rows[0]!.textContent).toContain("22% of expenses")
    expect(rows[6]!.textContent).toContain("Other (2)")
    expect(screen.queryByRole("img")).toBeNull()
  })
})
