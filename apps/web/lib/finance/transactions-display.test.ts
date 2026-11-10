import { describe, expect, it } from "vitest"

import {
  activeFilterCount,
  activeFilterSummary,
  dayHeading,
  groupTransactionsByDate,
  transactionCategoryLabel,
  transactionDetails,
  transactionTime,
  type TransactionFilterState,
} from "./transactions-display"
import { krw } from "@/lib/finance-format"
import type { Transaction } from "@/types/finance"

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    date: "2026-11-05",
    type: "expense",
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    categoryColor: null,
    description: "Synthetic entry",
    amountKrw: 1_000,
    currency: "KRW",
    originalAmount: null,
    exchangeRate: null,
    paymentMethodId: null,
    paymentMethodName: null,
    note: null,
    createdAt: "2026-11-05T06:12:00.000Z",
    updatedAt: "2026-11-05T06:12:00.000Z",
    ...overrides,
  }
}

const NO_FILTERS: TransactionFilterState = {
  type: undefined,
  categoryId: "",
  paymentMethodId: "",
  amountMin: undefined,
  amountMax: undefined,
}

describe("groupTransactionsByDate", () => {
  it("groups by date in first-appearance order and sums each direction", () => {
    const groups = groupTransactionsByDate([
      tx({ id: "a", date: "2026-11-05", amountKrw: 3_000 }),
      tx({ id: "b", date: "2026-11-04", type: "income", amountKrw: 50_000 }),
      tx({ id: "c", date: "2026-11-05", type: "income", amountKrw: 7_000 }),
      tx({ id: "d", date: "2026-11-05", amountKrw: 2_000 }),
    ])
    expect(groups.map((group) => group.date)).toEqual(["2026-11-05", "2026-11-04"])
    expect(groups[0]!.items.map((item) => item.id)).toEqual(["a", "c", "d"])
    expect(groups[0]!.expenseKrw).toBe(5_000)
    expect(groups[0]!.incomeKrw).toBe(7_000)
    expect(groups[1]!.expenseKrw).toBe(0)
    expect(groups[1]!.incomeKrw).toBe(50_000)
  })

  it("returns no groups for no transactions", () => {
    expect(groupTransactionsByDate([])).toEqual([])
  })
})

describe("dayHeading", () => {
  const now = new Date(2026, 10, 10, 12)

  it("names today and yesterday", () => {
    expect(dayHeading("2026-11-10", now)).toBe("Today")
    expect(dayHeading("2026-11-09", now)).toBe("Yesterday")
  })

  it("spells out older days without shouting", () => {
    expect(dayHeading("2026-11-05", now)).toBe("Thursday, Nov 5")
  })

  it("handles yesterday across a month boundary", () => {
    expect(dayHeading("2026-10-31", new Date(2026, 10, 1, 9))).toBe("Yesterday")
  })

  it("passes an unreadable date through", () => {
    expect(dayHeading("not-a-date", now)).toBe("not-a-date")
  })
})

describe("transactionCategoryLabel", () => {
  it("uses the category, or a neutral fallback per direction", () => {
    expect(transactionCategoryLabel({ type: "expense", categoryName: "Groceries" })).toBe(
      "Groceries",
    )
    expect(transactionCategoryLabel({ type: "expense", categoryName: null })).toBe("Uncategorized")
    expect(transactionCategoryLabel({ type: "income", categoryName: null })).toBe("Income")
    expect(transactionCategoryLabel({ type: "expense", categoryName: "" })).toBe("Uncategorized")
  })
})

describe("transactionTime", () => {
  it("formats a valid timestamp and rejects garbage", () => {
    expect(transactionTime("2026-11-05T06:12:00.000Z")).toMatch(/^\d{1,2}:\d{2} [AP]M$/)
    expect(transactionTime("nope")).toBeNull()
  })
})

describe("transactionDetails", () => {
  it("lists only the facts the record has", () => {
    expect(transactionDetails(tx({ createdAt: "bad" }))).toEqual([])
  })

  it("includes payment method, USD original with rate, note and time", () => {
    const details = transactionDetails(
      tx({
        paymentMethodName: "Card",
        currency: "USD",
        originalAmount: 12.5,
        exchangeRate: 1_380,
        note: "  shared lunch  ",
      }),
    )
    expect(details.map((detail) => detail.label)).toEqual([
      "Paid with",
      "Entered as",
      "Note",
      "Added",
    ])
    expect(details[0]!.value).toBe("Card")
    expect(details[1]!.value).toBe(`$12.50 at ${krw.format(1_380)} per $1`)
    expect(details[2]!.value).toBe("shared lunch")
  })

  it("shows a USD original without a rate when none was stored", () => {
    const details = transactionDetails(
      tx({ currency: "USD", originalAmount: 3, exchangeRate: null, createdAt: "bad" }),
    )
    expect(details).toEqual([{ label: "Entered as", value: "$3.00" }])
  })

  it("skips a blank note", () => {
    expect(transactionDetails(tx({ note: "   ", createdAt: "bad" }))).toEqual([])
  })
})

describe("activeFilterCount", () => {
  it("is zero with nothing set", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0)
  })

  it("counts type, category, method and each amount bound", () => {
    expect(
      activeFilterCount({
        type: "expense",
        categoryId: "c1",
        paymentMethodId: "m1",
        amountMin: 0,
        amountMax: 10,
      }),
    ).toBe(5)
  })
})

describe("activeFilterSummary", () => {
  const categories = [{ id: "c1", name: "Groceries" }]
  const methods = [{ id: "m1", name: "Card" }]

  it("is empty with nothing set", () => {
    expect(activeFilterSummary(NO_FILTERS, categories, methods)).toEqual([])
  })

  it("names each active filter", () => {
    expect(
      activeFilterSummary(
        {
          type: "income",
          categoryId: "c1",
          paymentMethodId: "m1",
          amountMin: 1_000,
          amountMax: 5_000,
        },
        categories,
        methods,
      ),
    ).toEqual(["Income", "Groceries", "Card", `${krw.format(1_000)} to ${krw.format(5_000)}`])
  })

  it("describes one-sided amount ranges, including a zero minimum", () => {
    expect(activeFilterSummary({ ...NO_FILTERS, amountMin: 0 }, [], [])).toEqual([
      `${krw.format(0)} or more`,
    ])
    expect(activeFilterSummary({ ...NO_FILTERS, amountMax: 987_654_321_000 }, [], [])).toEqual([
      `Up to ${krw.format(987_654_321_000)}`,
    ])
  })

  it("falls back when a filtered lookup is no longer loaded", () => {
    expect(
      activeFilterSummary({ ...NO_FILTERS, categoryId: "gone", paymentMethodId: "gone" }, [], []),
    ).toEqual(["1 category", "1 payment method"])
  })
})
