import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Route-level authorization for the ported finance API: every handler must go
// through requireFinanceUserId and scope its service call by the id it
// returns — never by anything in the URL, query string or body.

vi.mock("server-only", () => ({}))

const requireFinanceUserId = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
}))

const listTransactions = vi.fn()
const addTransaction = vi.fn()
const editTransaction = vi.fn()
const removeTransaction = vi.fn()
vi.mock("@/lib/server/finance/services/finance-transaction-service", () => ({
  listTransactions: (...args: unknown[]) => listTransactions(...args),
  addTransaction: (...args: unknown[]) => addTransaction(...args),
  editTransaction: (...args: unknown[]) => editTransaction(...args),
  removeTransaction: (...args: unknown[]) => removeTransaction(...args),
}))

const getFinanceOverviewSummary = vi.fn()
vi.mock("@/lib/server/finance/services/finance-analytics-service", () => ({
  getFinanceOverviewSummary: (...args: unknown[]) => getFinanceOverviewSummary(...args),
  getAnalyticsSummary: vi.fn(),
}))

import { AppError, Errors } from "@/lib/server/finance/errors"
import { GET as listRoute, POST as createRoute } from "./transactions/route"
import { DELETE as deleteRoute } from "./transactions/[id]/route"
import { GET as overviewRoute } from "./overview/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ATTACKER_CHOSEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const TX_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const url = (path: string) => `http://localhost/api/finance${path}`
const params = (id: string) => ({ params: Promise.resolve({ id }) })

afterEach(() => {
  vi.clearAllMocks()
})

describe("finance routes — denial paths", () => {
  it.each([
    ["no session", Errors.unauthorized(), 401, "UNAUTHORIZED"],
    ["unlinked user", new AppError("FINANCE_NOT_LINKED", "x", 403), 403, "FINANCE_NOT_LINKED"],
    ["not configured", new AppError("FINANCE_NOT_CONFIGURED", "x", 503), 503, "FINANCE_NOT_CONFIGURED"],
  ])("%s → %s envelope and no data access", async (_label, error, status, code) => {
    requireFinanceUserId.mockRejectedValue(error)

    const responses = await Promise.all([
      listRoute(new NextRequest(url("/transactions?start=2026-11-01&end=2026-11-30"))),
      createRoute(new NextRequest(url("/transactions"), { method: "POST", body: "{}" })),
      deleteRoute(new NextRequest(url(`/transactions/${TX_ID}`), { method: "DELETE" }), params(TX_ID)),
      overviewRoute(new NextRequest(url("/overview?month=2026-11"))),
    ])

    for (const response of responses) {
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: { code, message: expect.any(String) } })
    }
    expect(listTransactions).not.toHaveBeenCalled()
    expect(addTransaction).not.toHaveBeenCalled()
    expect(removeTransaction).not.toHaveBeenCalled()
    expect(getFinanceOverviewSummary).not.toHaveBeenCalled()
  })
})

describe("finance routes — ownership scoping", () => {
  it("lists transactions for the linked id, ignoring a userId in the query", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    listTransactions.mockResolvedValue({ items: [], hasMore: false })

    const response = await listRoute(
      new NextRequest(url(`/transactions?start=2026-11-01&end=2026-11-30&userId=${ATTACKER_CHOSEN}`)),
    )

    expect(response.status).toBe(200)
    expect(listTransactions).toHaveBeenCalledTimes(1)
    expect(listTransactions.mock.calls[0]![0]).toBe(LINKED)
  })

  it("deletes only through the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    removeTransaction.mockResolvedValue(undefined)

    const response = await deleteRoute(
      new NextRequest(url(`/transactions/${TX_ID}?userId=${ATTACKER_CHOSEN}`), { method: "DELETE" }),
      params(TX_ID),
    )

    expect(response.status).toBe(200)
    expect(removeTransaction).toHaveBeenCalledWith(LINKED, TX_ID)
  })

  it("rejects an invalid body with 422 before writing", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)

    const response = await createRoute(
      new NextRequest(url("/transactions"), { method: "POST", body: JSON.stringify({ userId: ATTACKER_CHOSEN }) }),
    )

    expect(response.status).toBe(422)
    expect(addTransaction).not.toHaveBeenCalled()
  })

  it("passes a not-found from the service through as 404", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    removeTransaction.mockRejectedValue(Errors.notFound("Transaction"))

    const response = await deleteRoute(
      new NextRequest(url(`/transactions/${TX_ID}`), { method: "DELETE" }),
      params(TX_ID),
    )

    expect(response.status).toBe(404)
  })
})
