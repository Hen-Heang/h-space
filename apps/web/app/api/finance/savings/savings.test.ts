import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Savings routes: scoped by the linked finance user; a goal (and its
// contributions) can only be reached through that user's own goal id.

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server/finance/db", () => ({
  sql: vi.fn(),
  isFinanceDatabaseConfigured: () => true,
}))
const requireFinanceUserId = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
}))

const repo = {
  findSavingsGoalsByUser: vi.fn(),
  findSavingsGoalById: vi.fn(),
  createSavingsGoal: vi.fn(),
  updateSavingsGoal: vi.fn(),
  deleteSavingsGoal: vi.fn(),
  findContributionsByGoal: vi.fn(),
  addContribution: vi.fn(),
}
vi.mock("@/lib/server/finance/repositories/finance-savings-repository", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const mocked: Record<string, unknown> = { ...actual }
  for (const name of Object.keys(actual)) {
    if (typeof actual[name] === "function") {
      mocked[name] = (...args: unknown[]) => {
        const fn = (repo as Record<string, (...a: unknown[]) => unknown>)[name]
        if (!fn) throw new Error(`unexpected repository call: ${name}`)
        return fn(...args)
      }
    }
  }
  return mocked
})

import { Errors } from "@/lib/server/finance/errors"
import { GET as listGoals, POST as createGoal } from "./route"
import { DELETE as deleteGoal, PATCH as updateGoal } from "./[id]/route"
import { GET as listContribs, POST as addContrib } from "./[id]/contributions/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const GOAL = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const url = (p: string) => `http://localhost/api/finance/savings${p}`
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) })

afterEach(() => vi.resetAllMocks())

describe("savings routes — denial", () => {
  it("refuses every route without a linked session and touches no data", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    const responses = await Promise.all([
      listGoals(new NextRequest(url(""))),
      createGoal(new NextRequest(url(""), json("POST", { name: "x", targetUsd: 1 }))),
      updateGoal(new NextRequest(url(`/${GOAL}`), json("PATCH", { name: "y" })), params(GOAL)),
      deleteGoal(new NextRequest(url(`/${GOAL}`), { method: "DELETE" }), params(GOAL)),
      listContribs(new NextRequest(url(`/${GOAL}/contributions`)), params(GOAL)),
      addContrib(
        new NextRequest(url(`/${GOAL}/contributions`), json("POST", { amountUsd: 10 })),
        params(GOAL),
      ),
    ])
    for (const response of responses) expect(response.status).toBe(401)
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled()
  })
})

describe("savings routes — ownership", () => {
  it("lists only the linked user's goals", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    repo.findSavingsGoalsByUser.mockResolvedValue([])
    expect((await listGoals(new NextRequest(url("")))).status).toBe(200)
    expect(repo.findSavingsGoalsByUser).toHaveBeenCalledWith(LINKED)
  })

  it("won't add a contribution to a goal the user doesn't own", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    repo.findSavingsGoalById.mockResolvedValue(null)
    const response = await addContrib(
      new NextRequest(url(`/${GOAL}/contributions`), json("POST", { amountUsd: 10 })),
      params(GOAL),
    )
    expect(response.status).toBe(404)
    expect(repo.findSavingsGoalById).toHaveBeenCalledWith(GOAL, LINKED)
    expect(repo.addContribution).not.toHaveBeenCalled()
  })

  it("won't list contributions of a goal the user doesn't own", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    repo.findSavingsGoalById.mockResolvedValue(null)
    const response = await listContribs(
      new NextRequest(url(`/${GOAL}/contributions`)),
      params(GOAL),
    )
    expect(response.status).toBe(404)
    expect(repo.findContributionsByGoal).not.toHaveBeenCalled()
  })

  it("deletes through the linked id and reports 404 for someone else's goal", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    repo.deleteSavingsGoal.mockResolvedValue(false)
    const response = await deleteGoal(
      new NextRequest(url(`/${GOAL}`), { method: "DELETE" }),
      params(GOAL),
    )
    expect(response.status).toBe(404)
    expect(repo.deleteSavingsGoal).toHaveBeenCalledWith(GOAL, LINKED)
  })

  it("rejects an invalid contribution amount before any lookup", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await addContrib(
      new NextRequest(url(`/${GOAL}/contributions`), json("POST", { amountUsd: -5 })),
      params(GOAL),
    )
    expect(response.status).toBe(422)
    expect(repo.findSavingsGoalById).not.toHaveBeenCalled()
  })
})
