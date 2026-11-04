import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const requireUser = vi.fn()
vi.mock("@/lib/server/ai", () => ({ requireUser: (req: Request) => requireUser(req) }))

import { requireFinanceUserId } from "./auth"
import { AppError } from "./errors"

// Synthetic ids only.
const HSPACE_ID = "11111111-1111-4111-8111-111111111111"
const LUYRA_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER_ID = "22222222-2222-4222-8222-222222222222"

const req = () => new Request("http://localhost/api/finance/overview", { headers: { authorization: "Bearer t" } })

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error("expected requireFinanceUserId to throw")
}

describe("requireFinanceUserId", () => {
  beforeEach(() => {
    vi.stubEnv("FINANCE_ACCOUNT_LINKS", `${HSPACE_ID}=${LUYRA_ID}`)
    vi.stubEnv("FINANCE_DATABASE_URL", "postgres://synthetic.invalid/db")
    requireUser.mockResolvedValue({ user: { id: HSPACE_ID }, db: {} })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    requireUser.mockReset()
  })

  it("returns the linked Luyra id for the verified H-Space user", async () => {
    await expect(requireFinanceUserId(req())).resolves.toBe(LUYRA_ID)
  })

  it("rejects a missing or invalid session with 401", async () => {
    requireUser.mockResolvedValue(Response.json({ error: "Invalid session" }, { status: 401 }))
    const error = await failure(requireFinanceUserId(req()))
    expect(error.status).toBe(401)
    expect(error.code).toBe("UNAUTHORIZED")
  })

  it("reports 503 when the Supabase bridge itself is not configured", async () => {
    requireUser.mockResolvedValue(Response.json({ error: "x" }, { status: 503 }))
    expect((await failure(requireFinanceUserId(req()))).status).toBe(503)
  })

  it("rejects a signed-in user with no link with 403", async () => {
    requireUser.mockResolvedValue({ user: { id: OTHER_ID }, db: {} })
    const error = await failure(requireFinanceUserId(req()))
    expect(error.status).toBe(403)
    expect(error.code).toBe("FINANCE_NOT_LINKED")
  })

  it("fails closed with 503 when no links are configured", async () => {
    vi.stubEnv("FINANCE_ACCOUNT_LINKS", "")
    expect((await failure(requireFinanceUserId(req()))).code).toBe("FINANCE_NOT_CONFIGURED")
  })

  it("fails closed with 503 when the link config is malformed", async () => {
    vi.stubEnv("FINANCE_ACCOUNT_LINKS", `${HSPACE_ID}=not-a-uuid`)
    expect((await failure(requireFinanceUserId(req()))).status).toBe(503)
  })

  it("fails closed with 503 when the finance database is not configured", async () => {
    vi.stubEnv("FINANCE_DATABASE_URL", "")
    expect((await failure(requireFinanceUserId(req()))).status).toBe(503)
  })
})
