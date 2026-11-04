import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const requireUser = vi.fn()
vi.mock("@/lib/server/ai", () => ({ requireUser: (req: Request) => requireUser(req) }))

import { financeConfigProblems, requireFinanceUserId } from "./auth"
import { AppError } from "./errors"

// A fake, password-free URL whose host is a sentinel we can search the log for.
const SENTINEL_HOST = "finance-db-sentinel.invalid"
const FAKE_DB_URL = `postgres://${SENTINEL_HOST}/db`

describe("financeConfigProblems", () => {
  const H = "11111111-1111-4111-8111-111111111111"
  const L = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

  it("is empty when everything is set", () => {
    expect(
      financeConfigProblems({
        FINANCE_DATABASE_URL: FAKE_DB_URL,
        FINANCE_ACCOUNT_LINKS: `${H}=${L}`,
      }),
    ).toEqual([])
  })

  it("names each missing setting", () => {
    expect(financeConfigProblems({})).toEqual([
      "FINANCE_DATABASE_URL is not set",
      "FINANCE_ACCOUNT_LINKS is not set",
    ])
  })

  it("accepts a quoted or psql-wrapped database URL", () => {
    for (const url of [`"${FAKE_DB_URL}"`, `psql '${FAKE_DB_URL}'`]) {
      expect(
        financeConfigProblems({ FINANCE_DATABASE_URL: url, FINANCE_ACCOUNT_LINKS: `${H}=${L}` }),
      ).toEqual([])
    }
  })

  it("calls out a database URL that isn't a Postgres URL, without echoing it", () => {
    const problems = financeConfigProblems({
      FINANCE_DATABASE_URL: `https://${SENTINEL_HOST}/db`,
      FINANCE_ACCOUNT_LINKS: `${H}=${L}`,
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/FINANCE_DATABASE_URL is malformed/)
    expect(problems[0]).not.toContain(SENTINEL_HOST)
  })

  it("calls out a malformed link without echoing its value", () => {
    const problems = financeConfigProblems({
      FINANCE_DATABASE_URL: FAKE_DB_URL,
      FINANCE_ACCOUNT_LINKS: `${H}:${L}`,
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/FINANCE_ACCOUNT_LINKS is malformed/)
    expect(problems[0]).not.toContain(H)
  })
})

describe("requireFinanceUserId — server log", () => {
  const H = "11111111-1111-4111-8111-111111111111"
  const L = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const OTHER = "22222222-2222-4222-8222-222222222222"
  const request = () =>
    new Request("http://localhost/api/finance/overview", { headers: { authorization: "Bearer t" } })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    requireUser.mockReset()
  })

  it("logs which setting is missing, never the database URL", async () => {
    vi.stubEnv("FINANCE_DATABASE_URL", FAKE_DB_URL)
    vi.stubEnv("FINANCE_ACCOUNT_LINKS", "")
    requireUser.mockResolvedValue({ user: { id: H }, db: {} })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(requireFinanceUserId(request())).rejects.toMatchObject({ status: 503 })
    const logged = warn.mock.calls.flat().join(" ")
    expect(logged).toContain("FINANCE_ACCOUNT_LINKS is not set")
    expect(logged).not.toContain(SENTINEL_HOST)
  })

  it("logs the caller's own H-Space id when it isn't linked, not the Luyra id", async () => {
    vi.stubEnv("FINANCE_DATABASE_URL", FAKE_DB_URL)
    vi.stubEnv("FINANCE_ACCOUNT_LINKS", `${H}=${L}`)
    requireUser.mockResolvedValue({ user: { id: OTHER }, db: {} })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(requireFinanceUserId(request())).rejects.toMatchObject({ status: 403 })
    const logged = warn.mock.calls.flat().join(" ")
    expect(logged).toContain(OTHER)
    expect(logged).not.toContain(L)
  })
})

// Synthetic ids only.
const HSPACE_ID = "11111111-1111-4111-8111-111111111111"
const LUYRA_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER_ID = "22222222-2222-4222-8222-222222222222"

const req = () =>
  new Request("http://localhost/api/finance/overview", { headers: { authorization: "Bearer t" } })

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
