import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Review + next-month plan. The plan is rebuilt server-side from the linked
// user's own history, so applying it can only touch categories in that plan.

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server/finance/db", () => ({
  sql: vi.fn(),
  isFinanceDatabaseConfigured: () => true,
}))
const requireFinanceUserId = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
}))
const getReviewSummary = vi.fn()
vi.mock("@/lib/server/finance/services/finance-analytics-service", () => ({
  getReviewSummary: (...a: unknown[]) => getReviewSummary(...a),
}))

// Repositories behind getNextMonthPlan / applyNextMonthPlan.
const repo = {
  findBudgetsByUser: vi.fn(),
  upsertBudgets: vi.fn(),
  findPreferences: vi.fn(),
  sumExpenseByCategoryForRange: vi.fn(),
  sumTotalsForRange: vi.fn(),
}
vi.mock("@/lib/server/finance/repositories/finance-budget-repository", () => ({
  findBudgetsByUser: (...a: unknown[]) => repo.findBudgetsByUser(...a),
  upsertBudgets: (...a: unknown[]) => repo.upsertBudgets(...a),
}))
vi.mock("@/lib/server/finance/repositories/finance-preferences-repository", () => ({
  findPreferences: (...a: unknown[]) => repo.findPreferences(...a),
}))
vi.mock("@/lib/server/finance/repositories/finance-transaction-repository", () => ({
  sumExpenseByCategoryForRange: (...a: unknown[]) => repo.sumExpenseByCategoryForRange(...a),
  sumTotalsForRange: (...a: unknown[]) => repo.sumTotalsForRange(...a),
}))
const buildBudgetPlan = vi.fn()
vi.mock("@/lib/finance/budget-plan", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildBudgetPlan: (...a: unknown[]) => buildBudgetPlan(...a),
}))

import { Errors } from "@/lib/server/finance/errors"
import { appMonth } from "@/lib/finance-cron-time"
import { shiftMonth } from "@/lib/finance/budget-plan"
import { GET as review } from "./route"
import { POST as applyPlan } from "./plan/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const MINE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const NOT_IN_PLAN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const LAST_MONTH = shiftMonth(appMonth(), -1)

const post = (b: unknown) =>
  applyPlan(
    new NextRequest("http://localhost/api/finance/review/plan", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  )

function givenPlanFor(categoryId: string) {
  repo.sumExpenseByCategoryForRange.mockResolvedValue([])
  repo.sumTotalsForRange.mockResolvedValue({ incomeKrw: 0, expenseKrw: 0 })
  repo.findBudgetsByUser.mockResolvedValue([])
  repo.findPreferences.mockResolvedValue({ targetSavingsRate: 20 })
  buildBudgetPlan.mockReturnValue({
    planMonth: appMonth(),
    recommendations: [{ categoryId, recommendedBudgetKrw: 300000, currentBudgetKrw: 250000 }],
  })
}

afterEach(() => vi.resetAllMocks())

describe("GET /api/finance/review", () => {
  it("builds the review for the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    getReviewSummary.mockResolvedValue({ month: LAST_MONTH })
    const response = await review(
      new NextRequest(`http://localhost/api/finance/review?month=${LAST_MONTH}`),
    )
    expect(response.status).toBe(200)
    expect(getReviewSummary).toHaveBeenCalledWith(LINKED, LAST_MONTH, { withPlan: true })
  })

  it("rejects a malformed month with 422", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await review(new NextRequest("http://localhost/api/finance/review?month=13"))
    expect(response.status).toBe(422)
    expect(getReviewSummary).not.toHaveBeenCalled()
  })

  it("refuses an unauthenticated caller", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    const response = await review(
      new NextRequest(`http://localhost/api/finance/review?month=${LAST_MONTH}`),
    )
    expect(response.status).toBe(401)
    expect(getReviewSummary).not.toHaveBeenCalled()
  })
})

describe("POST /api/finance/review/plan", () => {
  it("applies a change that matches the user's own plan", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    givenPlanFor(MINE)
    const response = await post({
      month: LAST_MONTH,
      changes: [{ categoryId: MINE, amountKrw: 300000, currentBudgetKrw: 250000 }],
    })
    expect(response.status).toBe(200)
    expect(repo.findBudgetsByUser).toHaveBeenCalledWith(LINKED)
    expect(repo.upsertBudgets).toHaveBeenCalledWith(LINKED, [
      { categoryId: MINE, amountKrw: 300000 },
    ])
  })

  it("refuses a category that isn't in the user's plan, writing nothing", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    givenPlanFor(MINE)
    const response = await post({
      month: LAST_MONTH,
      changes: [{ categoryId: NOT_IN_PLAN, amountKrw: 300000, currentBudgetKrw: 250000 }],
    })
    expect(response.status).toBe(409)
    expect(repo.upsertBudgets).not.toHaveBeenCalled()
  })

  it("refuses an amount the plan doesn't recommend", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    givenPlanFor(MINE)
    const response = await post({
      month: LAST_MONTH,
      changes: [{ categoryId: MINE, amountKrw: 9_999_999, currentBudgetKrw: 250000 }],
    })
    expect(response.status).toBe(409)
    expect(repo.upsertBudgets).not.toHaveBeenCalled()
  })

  it("refuses a plan for a month other than last month", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await post({
      month: shiftMonth(LAST_MONTH, -3),
      changes: [{ categoryId: MINE, amountKrw: 300000, currentBudgetKrw: 250000 }],
    })
    expect(response.status).toBe(422)
    expect(repo.upsertBudgets).not.toHaveBeenCalled()
  })

  it("refuses an unauthenticated caller before any lookup", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    const response = await post({
      month: LAST_MONTH,
      changes: [{ categoryId: MINE, amountKrw: 300000, currentBudgetKrw: 250000 }],
    })
    expect(response.status).toBe(401)
    expect(repo.findBudgetsByUser).not.toHaveBeenCalled()
  })
})
