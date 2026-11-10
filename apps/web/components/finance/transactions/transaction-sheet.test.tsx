// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/query/finance-queries", () => ({
  exchangeRateQuery: () => ({
    queryKey: ["test-exchange-rate"],
    queryFn: async () => ({ rate: 1_300, fallback: false }),
  }),
}))
vi.mock("@/components/finance/transactions/description-suggestions", () => ({
  DescriptionSuggestions: () => null,
}))

import { TransactionSheet } from "./transaction-sheet"
import type { Category, PaymentMethod, Transaction } from "@/types/finance"

afterEach(cleanup)

// jsdom has no matchMedia; the sheet only uses it to decide whether to autofocus.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList

// Synthetic data only.
const categories: Category[] = [
  { id: "c1", name: "Groceries", icon: null, color: null, type: "expense", spendingClass: null },
]
const paymentMethods: PaymentMethod[] = [
  { id: "m-bank", name: "Bank", icon: null },
  { id: "m-card", name: "Card", icon: null },
]

function existing(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    date: "2020-01-15",
    type: "expense",
    categoryId: "c1",
    categoryName: "Groceries",
    categoryIcon: null,
    categoryColor: null,
    description: "Corner market",
    amountKrw: 12_500,
    currency: "KRW",
    originalAmount: null,
    exchangeRate: null,
    paymentMethodId: "m-card",
    paymentMethodName: "Card",
    note: null,
    createdAt: "2020-01-15T06:12:00.000Z",
    updatedAt: "2020-01-15T06:12:00.000Z",
    ...overrides,
  }
}

function renderSheet(props: Partial<Parameters<typeof TransactionSheet>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onOpenChange = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TransactionSheet
        mode="create"
        categories={categories}
        paymentMethods={paymentMethods}
        templates={[]}
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onSaveTemplate={vi.fn().mockResolvedValue(undefined)}
        onDeleteTemplate={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSave, onOpenChange }
}

function position(element: Element) {
  return Array.from(document.querySelectorAll("*")).indexOf(element)
}

describe("TransactionSheet", () => {
  it("orders type → amount → currency → category → payment method, then More details", () => {
    renderSheet()
    const order = [
      screen.getByRole("group", { name: "Transaction type" }),
      screen.getByLabelText("Amount spent"),
      screen.getByRole("group", { name: "Currency" }),
      screen.getByRole("group", { name: "expense categories" }),
      screen.getByLabelText("Payment method"),
      screen.getByRole("button", { name: /More details/ }),
    ].map(position)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it("keeps date, note and Save as template behind More details for a new entry", () => {
    renderSheet()
    const toggle = screen.getByRole("button", { name: /More details/ })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(toggle.textContent ?? "").toContain("Today")
    expect(screen.queryByLabelText("Date")).toBeNull()
    expect(screen.queryByLabelText("Note (optional)")).toBeNull()
    expect(screen.queryByRole("button", { name: "Save as template" })).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByLabelText("Date")).toBeTruthy()
    expect(screen.getByLabelText("Note (optional)")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save as template" })).toBeTruthy()
  })

  it("opens More details when editing an older entry and has no template action", () => {
    renderSheet({ mode: "edit", transaction: existing() })
    expect(screen.getByRole("button", { name: /More details/ }).getAttribute("aria-expanded")).toBe(
      "true",
    )
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2020-01-15")
    expect(screen.queryByRole("button", { name: "Save as template" })).toBeNull()
  })

  it("marks the chosen type and currency with aria-pressed", () => {
    renderSheet()
    expect(screen.getByRole("button", { name: "expense" }).getAttribute("aria-pressed")).toBe(
      "true",
    )
    expect(screen.getByRole("button", { name: "KRW" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "income" }))
    expect(screen.getByRole("button", { name: "income" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByLabelText("Amount received")).toBeTruthy()
  })

  it("saves the same payload as before, defaulting the payment method to Bank", async () => {
    const { onSave, onOpenChange } = renderSheet()
    fireEvent.change(screen.getByLabelText("Amount spent"), { target: { value: "8000" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Lunch" } })
    fireEvent.click(screen.getByRole("button", { name: /Groceries/ }))
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        currency: "KRW",
        amountKrw: 8000,
        originalAmount: undefined,
        exchangeRate: undefined,
        description: "Lunch",
        categoryId: "c1",
        paymentMethodId: "m-bank",
        note: null,
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("keeps the existing validation messages", async () => {
    const { onSave } = renderSheet()
    fireEvent.submit(screen.getByLabelText("Description").closest("form")!)
    expect((await screen.findByRole("alert")).textContent ?? "").toContain(
      "Enter an amount greater than 0.",
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it("opens More details and explains when a cleared date was folded away", async () => {
    const { onSave } = renderSheet()
    const toggle = screen.getByRole("button", { name: /More details/ })
    fireEvent.click(toggle)
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "" } })
    fireEvent.click(toggle)
    fireEvent.change(screen.getByLabelText("Amount spent"), { target: { value: "8000" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Lunch" } })
    fireEvent.submit(screen.getByLabelText("Description").closest("form")!)

    expect((await screen.findByRole("alert")).textContent ?? "").toContain("Choose a date.")
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(onSave).not.toHaveBeenCalled()
  })
})
