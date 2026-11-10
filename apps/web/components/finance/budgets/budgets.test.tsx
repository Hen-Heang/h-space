// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BudgetRow } from "./budget-row"
import { BudgetSheet } from "./budget-sheet"
import { BudgetSummary } from "./budget-summary"
import type { BudgetPerformance } from "@/types/finance"

afterEach(cleanup)

function budget(overrides: Partial<BudgetPerformance> = {}): BudgetPerformance {
  return {
    categoryId: "food",
    categoryName: "Food",
    categoryIcon: "🍜",
    categoryColor: null,
    budgetKrw: 300_000,
    spentKrw: 120_000,
    remainingKrw: 180_000,
    usagePct: 40,
    overBudget: false,
    status: "ok",
    ...overrides,
  }
}

describe("BudgetRow", () => {
  it("shows spent of limit, what's left and the status, and opens the editor", () => {
    const onOpen = vi.fn()
    const row = budget()
    render(
      <ul>
        <BudgetRow budget={row} onOpen={onOpen} />
      </ul>,
    )
    const button = screen.getByRole("button", { name: /Edit Food budget/ })
    expect(button).toHaveProperty("textContent", expect.stringContaining("₩120,000 of ₩300,000"))
    expect(button.textContent).toContain("180,000 left")
    expect(button.textContent).toContain("Healthy")
    fireEvent.click(button)
    expect(onOpen).toHaveBeenCalledWith(row)
  })

  it("says over, not a negative amount, and keeps the status vocabulary", () => {
    render(
      <ul>
        <BudgetRow
          budget={budget({
            spentKrw: 320_000,
            remainingKrw: -20_000,
            usagePct: 107,
            overBudget: true,
            status: "exceeded",
          })}
          onOpen={() => {}}
        />
      </ul>,
    )
    const button = screen.getByRole("button", { name: /Edit Food budget/ })
    expect(button.textContent).toContain("20,000 over")
    expect(button.textContent).toContain("Exceeded")
    expect(button.textContent).not.toContain("-₩")
  })
})

describe("BudgetSummary", () => {
  it("puts the four old tile figures in one line", () => {
    render(
      <BudgetSummary
        monthLabel="November 2026"
        performance={[
          budget(),
          budget({
            categoryId: "fun",
            categoryName: "Fun",
            budgetKrw: 100_000,
            spentKrw: 90_000,
            remainingKrw: 10_000,
            status: "near_limit",
          }),
        ]}
      />,
    )
    const section = screen.getByRole("region", { name: "Summary" })
    expect(section.textContent).toContain("190,000 left")
    expect(section.textContent).toContain("₩210,000 of ₩400,000 spent across 2 categories")
    expect(section.textContent).toContain("1 category needs attention")
    expect(section.textContent).toContain("November 2026")
  })
})

describe("BudgetSheet", () => {
  it("offers Remove inside the editor and hands the budget back", () => {
    const onRemoveRequest = vi.fn()
    const row = budget()
    render(
      <BudgetSheet
        target={{ mode: "edit", budget: row }}
        open
        onOpenChange={() => {}}
        onSave={async () => {}}
        onRemoveRequest={onRemoveRequest}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Remove budget" }))
    expect(onRemoveRequest).toHaveBeenCalledWith(row)
  })

  it("has no Remove when creating a budget", () => {
    render(
      <BudgetSheet
        target={{ mode: "create", unbudgetedCategories: [] }}
        open
        onOpenChange={() => {}}
        onSave={async () => {}}
        onRemoveRequest={() => {}}
      />,
    )
    expect(screen.queryByRole("button", { name: "Remove budget" })).toBeNull()
    expect(screen.getByText("Every expense category already has a budget.")).toBeTruthy()
  })
})
