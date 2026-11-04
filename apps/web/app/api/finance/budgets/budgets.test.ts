import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Budget writes: the route must scope by the linked finance user, and the
// service must refuse a category that isn't that user's (added in H-Space).

vi.mock("server-only", () => ({}))
const requireFinanceUserId = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
}))
const findCategoryById = vi.fn()
vi.mock("@/lib/server/finance/repositories/finance-lookup-repository", () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  findPaymentMethodById: vi.fn(),
}))
const upsertBudgetRepo = vi.fn()
const deleteBudgetRepo = vi.fn()
vi.mock("@/lib/server/finance/repositories/finance-budget-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  upsertBudget: (...args: unknown[]) => upsertBudgetRepo(...args),
  deleteBudget: (...args: unknown[]) => deleteBudgetRepo(...args),
}))
vi.mock("@/lib/server/finance/db", () => ({ sql: vi.fn(), isFinanceDatabaseConfigured: () => true }))

import { Errors } from "@/lib/server/finance/errors"
import { PUT } from "./route"
import { DELETE } from "./[categoryId]/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CATEGORY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const put = (body: unknown) =>
  PUT(new NextRequest("http://localhost/api/finance/budgets", { method: "PUT", body: JSON.stringify(body) }))
const del = (id: string) =>
  DELETE(new NextRequest(`http://localhost/api/finance/budgets/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ categoryId: id }),
  })

afterEach(() => vi.resetAllMocks())

describe("PUT /api/finance/budgets", () => {
  it("sets a budget on the user's own category", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    findCategoryById.mockResolvedValue({ id: CATEGORY })
    const response = await put({ categoryId: CATEGORY, amountKrw: 300000 })
    expect(response.status).toBe(200)
    expect(findCategoryById).toHaveBeenCalledWith(CATEGORY, LINKED)
    expect(upsertBudgetRepo).toHaveBeenCalledWith(LINKED, CATEGORY, 300000)
  })

  it("refuses a category that isn't the user's", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    findCategoryById.mockResolvedValue(null)
    const response = await put({ categoryId: CATEGORY, amountKrw: 300000 })
    expect(response.status).toBe(422)
    expect(upsertBudgetRepo).not.toHaveBeenCalled()
  })

  it("refuses an unauthenticated caller before any lookup", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    const response = await put({ categoryId: CATEGORY, amountKrw: 300000 })
    expect(response.status).toBe(401)
    expect(findCategoryById).not.toHaveBeenCalled()
    expect(upsertBudgetRepo).not.toHaveBeenCalled()
  })

  it("rejects an invalid body with 422", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await put({ categoryId: "not-a-uuid", amountKrw: -5 })
    expect(response.status).toBe(422)
    expect(upsertBudgetRepo).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/finance/budgets/[categoryId]", () => {
  it("deletes only within the linked user's rows", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await del(CATEGORY)
    expect(response.status).toBe(200)
    expect(deleteBudgetRepo).toHaveBeenCalledWith(LINKED, CATEGORY)
  })

  it("refuses an unlinked user", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    expect((await del(CATEGORY)).status).toBe(401)
    expect(deleteBudgetRepo).not.toHaveBeenCalled()
  })
})
