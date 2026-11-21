import { afterEach, describe, expect, it, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"

const session = vi.hoisted(() => ({ userId: "owner-a" as string | null }))
const api = vi.hoisted(() => ({ listSavingsGoals: vi.fn() }))
vi.mock("@/lib/auth-store", () => ({ getUserId: () => session.userId }))
vi.mock("@/lib/api/finance", () => ({
  ...api,
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getAnalyticsSummary: vi.fn(),
  getDescriptionSuggestions: vi.fn(),
  getExchangeRate: vi.fn(),
  getFinanceOverview: vi.fn(),
  getPreferences: vi.fn(),
  listBudgets: vi.fn(),
  listCategories: vi.fn(),
  listPaymentMethods: vi.fn(),
  listRecurringRules: vi.fn(),
  listTemplates: vi.fn(),
  listTransactions: vi.fn(),
}))

import {
  analyticsQuery,
  budgetsQuery,
  categoriesQuery,
  exchangeRateQuery,
  financeKeys,
  invalidateAfter,
  overviewQuery,
  paymentMethodsQuery,
  placeTransactionInLists,
  preferencesQuery,
  recurringRulesQuery,
  savingsGoalsQuery,
  shouldRetryFinanceQuery,
  templatesQuery,
  transactionListQuery,
} from "./finance-queries"
import { ApiError } from "@/lib/api/finance-client"
import type { Transaction } from "@/types/finance"

afterEach(() => {
  session.userId = "owner-a"
  vi.resetAllMocks()
})

const filters = { start: "2026-11-01", end: "2026-12-01" }
const options = () => [
  savingsGoalsQuery(),
  categoriesQuery(),
  paymentMethodsQuery(),
  templatesQuery(),
  preferencesQuery(),
  recurringRulesQuery(),
  exchangeRateQuery(),
  overviewQuery("2026-11"),
  analyticsQuery("2026-11"),
  budgetsQuery(filters.start, filters.end),
  transactionListQuery(filters),
]

describe("finance account isolation", () => {
  it("constructs every query for the current account and disables anonymous reads", () => {
    const ownerKeys = options().map((option) => option.queryKey)
    session.userId = "owner-b"
    options().forEach((option, index) => {
      expect(option.queryKey.slice(0, 2)).toEqual(["finance", "owner-b"])
      expect(option.queryKey).not.toEqual(ownerKeys[index])
    })
    session.userId = null
    options().forEach((option) => expect(option.enabled).toBe(false))
  })

  it("does not expose cached savings to an unlinked account after its request fails", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const ownerGoals = [{ id: "synthetic-goal", name: "Private goal" }]
    api.listSavingsGoals.mockResolvedValueOnce(ownerGoals)
    const ownerQuery = savingsGoalsQuery()
    await client.fetchQuery(ownerQuery)
    session.userId = "unlinked"
    const unlinkedQuery = savingsGoalsQuery()
    expect(client.getQueryData(unlinkedQuery.queryKey)).toBeUndefined()
    api.listSavingsGoals.mockRejectedValueOnce(new Error("403 Forbidden"))
    await expect(client.fetchQuery({ ...unlinkedQuery, retry: false })).rejects.toThrow("403")
    expect(client.getQueryData(unlinkedQuery.queryKey)).toBeUndefined()
    expect(client.getQueryData(ownerQuery.queryKey)).toEqual(ownerGoals)
    client.clear()
  })

  it("invalidates only the current account and ignores saves from an earlier session", async () => {
    const client = new QueryClient()
    const ownerKey = financeKeys.savingsGoals()
    client.setQueryData(ownerKey, [])
    session.userId = "owner-b"
    const nextKey = financeKeys.savingsGoals()
    client.setQueryData(nextKey, [])
    await invalidateAfter(client, "savings")
    expect(client.getQueryState(ownerKey)?.isInvalidated).toBe(false)
    expect(client.getQueryState(nextKey)?.isInvalidated).toBe(true)
    const listKey = financeKeys.transactionList(filters)
    const data = { pages: [{ transactions: [], hasMore: false }], pageParams: [0] }
    client.setQueryData(listKey, data)
    placeTransactionInLists(client, { id: "old-save" } as Transaction, "owner-a")
    expect(client.getQueryData(listKey)).toEqual(data)
    client.clear()
  })
})

describe("finance query retries", () => {
  const unavailable = () =>
    new ApiError("FINANCE_DATABASE_UNAVAILABLE", "Finance is unavailable right now.", 503)

  it("never retries a 503 and keeps the default three retries otherwise", () => {
    expect(shouldRetryFinanceQuery(0, unavailable())).toBe(false)
    const serverError = new ApiError("INTERNAL_ERROR", "Something went wrong.", 500)
    expect(shouldRetryFinanceQuery(0, serverError)).toBe(true)
    expect(shouldRetryFinanceQuery(2, serverError)).toBe(true)
    expect(shouldRetryFinanceQuery(3, serverError)).toBe(false)
    expect(shouldRetryFinanceQuery(0, new TypeError("Failed to fetch"))).toBe(true)
  })

  it("applies the rule to every finance query", () => {
    options().forEach((option) => expect(option.retry).toBe(shouldRetryFinanceQuery))
  })

  it("fails a 503 after one request and still retries a 500", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
    api.listSavingsGoals.mockRejectedValue(unavailable())
    await expect(client.fetchQuery(savingsGoalsQuery())).rejects.toMatchObject({ status: 503 })
    expect(api.listSavingsGoals).toHaveBeenCalledTimes(1)

    client.clear()
    api.listSavingsGoals.mockReset()
    api.listSavingsGoals.mockRejectedValue(
      new ApiError("INTERNAL_ERROR", "Something went wrong.", 500),
    )
    await expect(client.fetchQuery(savingsGoalsQuery())).rejects.toMatchObject({ status: 500 })
    expect(api.listSavingsGoals).toHaveBeenCalledTimes(4)
    client.clear()
  })
})
