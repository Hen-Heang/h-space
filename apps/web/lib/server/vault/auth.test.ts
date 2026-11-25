import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const requireUser = vi.hoisted(() => vi.fn())
vi.mock("@/lib/server/ai", () => ({ requireUser: (req: Request) => requireUser(req) }))

import {
  accessTokenAal,
  hasVerifiedFactor,
  requireRecentMfa,
  requireVaultUser,
  STEP_UP_MAX_AGE_SECONDS,
} from "./auth"
import { VaultError } from "./http"

const USER_ID = "00000000-0000-4000-8000-00000000000a"
// Placeholder without credentials; only its shape matters here.
const DB_URL = "postgresql://vault_app@db.example.invalid/hspace"

function token(claims: Record<string, unknown>) {
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url")
  return `${encode({ alg: "ES256" })}.${encode(claims)}.sig`
}

function request(aal: string | null) {
  const headers: Record<string, string> = {}
  if (aal !== null) headers.authorization = `Bearer ${token({ sub: USER_ID, aal })}`
  return new Request("https://h.example/api/vault/items", { headers })
}

function signedIn(factors: Array<{ status: string }>) {
  requireUser.mockResolvedValue({ user: { id: USER_ID, factors }, db: {} })
}

async function failure(req: Request): Promise<VaultError> {
  const error = await requireVaultUser(req).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(VaultError)
  return error as VaultError
}

beforeEach(() => {
  vi.stubEnv("VAULT_DATABASE_URL", DB_URL)
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  requireUser.mockReset()
})

describe("requireVaultUser", () => {
  it("returns the verified user id for an aal2 session with an authenticator", async () => {
    signedIn([{ status: "verified" }])
    await expect(requireVaultUser(request("aal2"))).resolves.toBe(USER_ID)
  })

  it("refuses without a valid session (401)", async () => {
    requireUser.mockResolvedValue(Response.json({ error: "Invalid session" }, { status: 401 }))
    expect(await failure(request(null))).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })

  it("refuses a password-only (aal1) session even with an authenticator (403)", async () => {
    signedIn([{ status: "verified" }])
    expect(await failure(request("aal1"))).toMatchObject({
      status: 403,
      code: "VAULT_MFA_REQUIRED",
    })
  })

  it("closes the vault as soon as the last authenticator is removed, despite an aal2 token", async () => {
    signedIn([])
    expect(await failure(request("aal2"))).toMatchObject({ code: "VAULT_MFA_REQUIRED" })
    signedIn([{ status: "unverified" }])
    expect(await failure(request("aal2"))).toMatchObject({ code: "VAULT_MFA_REQUIRED" })
  })

  it("refuses a token without an aal claim", async () => {
    signedIn([{ status: "verified" }])
    const req = new Request("https://h.example/api/vault/items", {
      headers: { authorization: `Bearer ${token({ sub: USER_ID })}` },
    })
    expect(await failure(req)).toMatchObject({ code: "VAULT_MFA_REQUIRED" })
  })

  it("is unavailable (503) without a vault database, naming only the setting", async () => {
    vi.stubEnv("VAULT_DATABASE_URL", "")
    signedIn([{ status: "verified" }])
    expect(await failure(request("aal2"))).toMatchObject({
      status: 503,
      code: "VAULT_NOT_CONFIGURED",
    })
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("VAULT_DATABASE_URL"))
  })

  it("is unavailable (503) when Supabase isn't configured", async () => {
    requireUser.mockResolvedValue(Response.json({ error: "not configured" }, { status: 503 }))
    expect(await failure(request("aal2"))).toMatchObject({ status: 503 })
  })
})

describe("requireRecentMfa", () => {
  const NOW = Date.UTC(2026, 10, 25, 3, 0, 0)
  const nowSeconds = NOW / 1000
  const withTotpAt = (seconds: number | null) =>
    new Request("https://h.example/api/vault/reset", {
      headers: {
        authorization: `Bearer ${token({
          sub: USER_ID,
          aal: "aal2",
          amr:
            seconds === null
              ? [{ method: "password", timestamp: nowSeconds - 10 }]
              : [
                  { method: "password", timestamp: nowSeconds - 86_400 },
                  { method: "totp", timestamp: seconds },
                ],
        })}`,
      },
    })
  const refusal = (req: Request) => {
    try {
      requireRecentMfa(req, NOW)
    } catch (error) {
      return error
    }
    return null
  }

  it("passes a code checked within the last five minutes", () => {
    expect(refusal(withTotpAt(nowSeconds - 30))).toBeNull()
    expect(refusal(withTotpAt(nowSeconds - STEP_UP_MAX_AGE_SECONDS))).toBeNull()
  })

  it("refuses an older code, no code, or a far-future one (403, never 401)", () => {
    for (const req of [
      withTotpAt(nowSeconds - STEP_UP_MAX_AGE_SECONDS - 1),
      withTotpAt(nowSeconds - 86_400),
      withTotpAt(null),
      withTotpAt(nowSeconds + 3600),
    ]) {
      expect(refusal(req)).toMatchObject({ status: 403, code: "VAULT_STEP_UP_REQUIRED" })
    }
  })

  it("tolerates a slightly fast clock", () => {
    expect(refusal(withTotpAt(nowSeconds + 20))).toBeNull()
  })
})

describe("helpers", () => {
  it("reads the aal claim and tolerates junk", () => {
    expect(accessTokenAal(token({ aal: "aal2" }))).toBe("aal2")
    expect(accessTokenAal("nope")).toBeNull()
    expect(accessTokenAal("a.%%%.c")).toBeNull()
  })

  it("only counts verified factors", () => {
    expect(hasVerifiedFactor([{ status: "verified" }])).toBe(true)
    expect(hasVerifiedFactor([{ status: "unverified" }])).toBe(false)
    expect(hasVerifiedFactor(null)).toBe(false)
  })
})
