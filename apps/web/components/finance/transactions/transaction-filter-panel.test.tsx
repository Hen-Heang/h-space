// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransactionFilterPanel } from "./transaction-filter-panel"

afterEach(cleanup)

function renderPanel(overrides: Partial<Parameters<typeof TransactionFilterPanel>[0]> = {}) {
  const props: Parameters<typeof TransactionFilterPanel>[0] = {
    open: true,
    typeFilter: undefined,
    onTypeChange: vi.fn(),
    categories: [
      {
        id: "c1",
        name: "Groceries",
        icon: null,
        color: null,
        type: "expense",
        spendingClass: null,
      },
    ],
    categoryFilter: "",
    onCategoryChange: vi.fn(),
    paymentMethods: [{ id: "m1", name: "Card", icon: null }],
    paymentMethodFilter: "",
    onPaymentMethodChange: vi.fn(),
    amountMin: "",
    onAmountMinChange: vi.fn(),
    amountMax: "",
    onAmountMaxChange: vi.fn(),
    sort: "date_desc",
    onSortChange: vi.fn(),
    activeFilterCount: 0,
    onClear: vi.fn(),
    ...overrides,
  }
  render(<TransactionFilterPanel {...props} />)
  return props
}

describe("TransactionFilterPanel", () => {
  it("renders nothing while closed", () => {
    renderPanel({ open: false })
    expect(screen.queryByRole("group", { name: "Transaction filters" })).toBeNull()
  })

  it("holds type, category, payment method, amount range and sort", () => {
    renderPanel()
    expect(screen.getByRole("group", { name: "Transaction filters" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Type" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Filter by category" })).toBeTruthy()
    expect(screen.getByLabelText("Payment method")).toBeTruthy()
    expect(screen.getByLabelText("Min amount (₩)")).toBeTruthy()
    expect(screen.getByLabelText("Max amount (₩)")).toBeTruthy()
    expect(screen.getByLabelText("Sort by")).toBeTruthy()
  })

  it("marks the active type with aria-pressed and reports changes", () => {
    const props = renderPanel({ typeFilter: "expense" })
    expect(screen.getByRole("button", { name: "Expense" }).getAttribute("aria-pressed")).toBe(
      "true",
    )
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(screen.getByRole("button", { name: "Income" }))
    expect(props.onTypeChange).toHaveBeenCalledWith("income")
    fireEvent.click(screen.getByRole("button", { name: "All" }))
    expect(props.onTypeChange).toHaveBeenCalledWith(undefined)
  })

  it("reports category changes", () => {
    const props = renderPanel()
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by category" }), {
      target: { value: "c1" },
    })
    expect(props.onCategoryChange).toHaveBeenCalledWith("c1")
  })

  it("offers to clear only when something is filtered", () => {
    renderPanel()
    expect(screen.queryByRole("button", { name: /Clear/ })).toBeNull()
    cleanup()
    const props = renderPanel({ activeFilterCount: 2 })
    fireEvent.click(screen.getByRole("button", { name: "Clear 2 filters" }))
    expect(props.onClear).toHaveBeenCalledTimes(1)
  })
})
