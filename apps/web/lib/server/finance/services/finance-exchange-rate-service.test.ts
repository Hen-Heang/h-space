import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"

vi.mock("server-only", () => ({}))

// The rate table is faked; nothing reaches Neon or the rate provider.
const repo = vi.hoisted(() => ({
  findRecentRate: vi.fn(),
  findLatestRate: vi.fn(),
  insertRate: vi.fn(),
}))
vi.mock("@/lib/server/finance/repositories/finance-exchange-rate-repository", () => repo)

import { getUsdToKrwRate } from "./finance-exchange-rate-service"

// A database error whose message quotes the values it was handling. The
// value must never reach the server log.
const QUOTED = "1371.25-synthetic"
const dbError = () =>
  Object.assign(new Error(`insert failed for row (USD, KRW, ${QUOTED})`), { code: "23505" })

const liveRate = (rate: number) =>
  vi.fn(async () => Response.json({ result: "success", base_code: "USD", rates: { KRW: rate } }))

let log: MockInstance<typeof console.error>

beforeEach(() => {
  log = vi.spyOn(console, "error").mockImplementation(() => {})
  vi.stubEnv("EXCHANGE_RATE_API_KEY", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.values(repo).forEach((fn) => fn.mockReset())
})

function loggedText() {
  return JSON.stringify(log.mock.calls.map((call) => call.map(String)))
}

describe("getUsdToKrwRate logging", () => {
  it("logs a failed cache lookup in one line, without the database message", async () => {
    repo.findRecentRate.mockRejectedValue(dbError())

    const result = await getUsdToKrwRate()

    expect(result.fallback).toBe(true)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]).toEqual([
      "[finance] cached exchange rate lookup failed: Error (23505)",
    ])
    expect(loggedText()).not.toContain(QUOTED)
  })

  it("logs a failed stored-rate fallback without the database message", async () => {
    repo.findRecentRate.mockResolvedValue(null)
    repo.findLatestRate.mockRejectedValue(dbError())
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    )

    const result = await getUsdToKrwRate()

    expect(result).toMatchObject({ rate: 1370, fallback: true })
    expect(log.mock.calls.map((c) => c[0])).toContain(
      "[finance] stored exchange rate lookup failed, using hardcoded fallback: Error (23505)",
    )
    expect(loggedText()).not.toContain(QUOTED)
  })

  it("keeps the live rate and logs a failed cache write without the database message", async () => {
    repo.findRecentRate.mockResolvedValue(null)
    repo.insertRate.mockRejectedValue(dbError())
    vi.stubGlobal("fetch", liveRate(1400))

    const result = await getUsdToKrwRate()

    expect(result).toMatchObject({ rate: 1400, cached: false, fallback: false })
    expect(log.mock.calls).toEqual([
      ["[finance] failed to store fetched exchange rate: Error (23505)"],
    ])
    expect(loggedText()).not.toContain(QUOTED)
  })
})
