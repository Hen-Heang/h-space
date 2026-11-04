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
  templatesQuery,
  transactionListQuery,
} from "./finance-queries"
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
    await expect(client.fetchQuery(unlinkedQuery)).rejects.toThrow("403")
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
