import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const runRecurring = vi.fn()
vi.mock("@/lib/server/finance/services/finance-recurring-service", () => ({
  runRecurring: (...args: unknown[]) => runRecurring(...args),
}))

import { GET } from "./route"

const SECRET = "synthetic-cron-secret-for-tests"
const call = (authorization?: string) =>
  GET(
    new NextRequest("http://localhost/api/finance/cron/recurring", {
      headers: authorization ? { authorization } : {},
    }),
  )

describe("GET /api/finance/cron/recurring", () => {
  beforeEach(() => vi.stubEnv("CRON_SECRET", SECRET))
  afterEach(() => {
    vi.unstubAllEnvs()
    runRecurring.mockReset()
  })

  it("runs the job for the scheduler", async () => {
    runRecurring.mockResolvedValue({ scanned: 2, notified: 0, applied: 3 })
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { scanned: 2, notified: 0, applied: 3 } })
    expect(runRecurring).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["no header", undefined],
    ["wrong secret", "Bearer not-the-secret"],
    ["wrong scheme", `Basic ${SECRET}`],
    ["a user's session token", "Bearer eyJhbGciOiJIUzI1NiJ9.synthetic.token"],
  ])("rejects %s with 401 and does nothing", async (_label, header) => {
    const response = await call(header)
    expect(response.status).toBe(401)
    expect(runRecurring).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(503)
    expect(runRecurring).not.toHaveBeenCalled()
  })
})
