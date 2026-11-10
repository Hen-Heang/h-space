// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransactionRow } from "./transaction-row"
import type { Transaction } from "@/types/finance"

afterEach(cleanup)

// Synthetic data only.
function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    date: "2026-11-05",
    type: "expense",
    categoryId: "c1",
    categoryName: "Groceries",
    categoryIcon: null,
    categoryColor: null,
    description: "Corner market",
    amountKrw: 12_500,
    currency: "USD",
    originalAmount: 9.5,
    exchangeRate: 1_315,
    paymentMethodId: "m1",
    paymentMethodName: "Card",
    note: "Synthetic note",
    createdAt: "2026-11-05T06:12:00.000Z",
    updatedAt: "2026-11-05T06:12:00.000Z",
    ...overrides,
  }
}

function renderRow(props: Partial<Parameters<typeof TransactionRow>[0]> = {}) {
  const onEdit = vi.fn()
  const onDeleteRequest = vi.fn()
  render(
    <ul>
      <TransactionRow
        transaction={tx()}
        onEdit={onEdit}
        onDeleteRequest={onDeleteRequest}
        {...props}
      />
    </ul>,
  )
  return { onEdit, onDeleteRequest }
}

describe("TransactionRow", () => {
  it("shows title and amount, then category · date, and keeps secondary facts out of the row", () => {
    renderRow()
    const row = screen.getByRole("button", { name: /^Corner market/ })
    expect(row.textContent ?? "").toContain("Corner market")
    expect(row.textContent ?? "").toContain("12,500")
    expect(row.textContent ?? "").toContain("Groceries · Nov 5")
    expect(row.textContent ?? "").not.toContain("Card")
    expect(row.textContent ?? "").not.toContain("Synthetic note")
    expect(row.textContent ?? "").not.toContain("$9.50")
  })

  it("opens the editor on tap", () => {
    const { onEdit } = renderRow()
    fireEvent.click(screen.getByRole("button", { name: /^Corner market/ }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }))
  })

  it("lists payment method, USD original, note and time in the actions menu", () => {
    const { onDeleteRequest } = renderRow()
    const trigger = screen.getByRole("button", { name: "Actions for Corner market" })
    fireEvent.keyDown(trigger, { key: "Enter" })
    const menu = screen.getByRole("menu")
    expect(menu.textContent ?? "").toContain("Paid with")
    expect(menu.textContent ?? "").toContain("Card")
    expect(menu.textContent ?? "").toContain("$9.50 at")
    expect(menu.textContent ?? "").toContain("Synthetic note")
    expect(menu.textContent ?? "").toContain("Added")
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }))
    expect(onDeleteRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }))
  })

  it("becomes a checkbox in selection mode with no actions menu", () => {
    const onToggle = vi.fn()
    const { onEdit } = renderRow({ selection: { selected: true, onToggle } })
    const checkbox = screen.getByRole("checkbox", { name: "Select Corner market" })
    expect(checkbox.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(checkbox)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /Actions for/ })).toBeNull()
  })

  it("falls back to a neutral category label", () => {
    renderRow({ transaction: tx({ categoryName: null, type: "income" }) })
    expect(screen.getByRole("button", { name: /^Corner market/ }).textContent ?? "").toContain(
      "Income · Nov 5",
    )
  })
})
