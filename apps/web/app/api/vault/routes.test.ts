import { NeonDbError } from "@neondatabase/serverless"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

// SAFETY: Supabase verification and the Neon-backed service are both fakes;
// nothing here reaches a real service. All values are fictional.
const requireUser = vi.hoisted(() => vi.fn())
vi.mock("@/lib/server/ai", () => ({ requireUser: (req: Request) => requireUser(req) }))

const service = vi.hoisted(() => ({
  getKeyset: vi.fn(),
  saveKeyset: vi.fn(),
  resetVault: vi.fn(),
  listItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}))
vi.mock("@/lib/server/vault/service", () => service)

import { vaultErrors } from "@/lib/server/vault/http"
import { GET as getItems, POST as postItem } from "./items/route"
import { DELETE as deleteItem, PUT as putItem } from "./items/[id]/route"
import { GET as getKeyset, PUT as putKeyset } from "./keyset/route"
import { POST as postReset } from "./reset/route"

const ME = "00000000-0000-4000-8000-00000000000a"
const ITEM = "0b9f3e3a-6a51-4c5e-9d0a-2f4b8c1d7e60"
const ENVELOPE = `v2.${"C".repeat(16)}.${"D".repeat(40)}==`

function bearer(aal: string) {
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url")
  return `Bearer ${encode({ alg: "ES256" })}.${encode({ sub: ME, aal })}.sig`
}

function req(path: string, init: { method?: string; body?: unknown; aal?: string | null } = {}) {
  const headers: Record<string, string> = {}
  if (init.aal !== null) headers.authorization = bearer(init.aal ?? "aal2")
  const body =
    init.body === undefined
      ? undefined
      : typeof init.body === "string"
        ? init.body
        : JSON.stringify(init.body)
  if (body !== undefined) headers["content-type"] = "application/json"
  return new Request(`https://h.example/api/vault${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  })
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.stubEnv("VAULT_DATABASE_URL", "postgresql://vault_app@db.example.invalid/hspace")
  requireUser.mockImplementation(async (r: Request) =>
    r.headers.get("authorization")
      ? { user: { id: ME, factors: [{ status: "verified" }] }, db: {} }
      : Response.json({ error: "Not signed in" }, { status: 401 }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  Object.values(service).forEach((fn) => fn.mockReset())
})

describe("gate", () => {
  it("refuses without a session (401) and never touches storage", async () => {
    const res = await getItems(req("/items", { aal: null }))
    expect(res.status).toBe(401)
    expect(service.listItems).not.toHaveBeenCalled()
  })

  it("refuses a password-only session (403 VAULT_MFA_REQUIRED)", async () => {
    const res = await getItems(req("/items", { aal: "aal1" }))
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe("VAULT_MFA_REQUIRED")
    expect(service.listItems).not.toHaveBeenCalled()
  })

  it("scopes storage to the verified user and never caches", async () => {
    service.listItems.mockResolvedValue([])
    const res = await getItems(req("/items"))
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(service.listItems).toHaveBeenCalledWith(ME)
  })
})

describe("bodies", () => {
  it("creates an item (201) from an id and a v2 envelope", async () => {
    service.createItem.mockResolvedValue({ id: ITEM })
    const res = await postItem(
      req("/items", { method: "POST", body: { id: ITEM, payloadCiphertext: ENVELOPE } }),
    )
    expect(res.status).toBe(201)
    expect(service.createItem).toHaveBeenCalledWith(ME, { id: ITEM, payloadCiphertext: ENVELOPE })
  })

  it("refuses plaintext and extra fields (400)", async () => {
    for (const body of [
      { id: ITEM, payloadCiphertext: "hunter2" },
      { id: ITEM, payloadCiphertext: ENVELOPE, serviceName: "Example" },
      { id: ITEM, payloadCiphertext: ENVELOPE, userId: "someone-else" },
    ]) {
      const res = await postItem(req("/items", { method: "POST", body }))
      expect(res.status).toBe(400)
    }
    expect(service.createItem).not.toHaveBeenCalled()
  })

  it("refuses non-JSON (400) and oversized bodies (413)", async () => {
    expect((await postItem(req("/items", { method: "POST", body: "{nope" }))).status).toBe(400)
    const huge = JSON.stringify({ id: ITEM, payloadCiphertext: "x".repeat(40_000) })
    expect((await postItem(req("/items", { method: "POST", body: huge }))).status).toBe(413)
    expect(service.createItem).not.toHaveBeenCalled()
  })

  it("refuses a non-UUID item id (400)", async () => {
    const res = await deleteItem(req("/items/x", { method: "DELETE" }), params("../keyset"))
    expect(res.status).toBe(400)
    expect(service.deleteItem).not.toHaveBeenCalled()
  })

  it("passes the version through on update", async () => {
    service.updateItem.mockResolvedValue({ id: ITEM, version: 3 })
    const res = await putItem(
      req(`/items/${ITEM}`, { method: "PUT", body: { payloadCiphertext: ENVELOPE, version: 2 } }),
      params(ITEM),
    )
    expect(res.status).toBe(200)
    expect(service.updateItem).toHaveBeenCalledWith(ME, ITEM, {
      payloadCiphertext: ENVELOPE,
      version: 2,
    })
  })

  it("needs exactly RESET to reset", async () => {
    expect((await postReset(req("/reset", { method: "POST", body: {} }))).status).toBe(400)
    service.resetVault.mockResolvedValue(0)
    expect(
      (await postReset(req("/reset", { method: "POST", body: { confirm: "RESET" } }))).status,
    ).toBe(200)
    expect(service.resetVault).toHaveBeenCalledWith(ME)
  })

  it("refuses a keyset with a plaintext-looking field", async () => {
    const res = await putKeyset(
      req("/keyset", { method: "PUT", body: { masterPassword: "fictional" } }),
    )
    expect(res.status).toBe(400)
    expect(service.saveKeyset).not.toHaveBeenCalled()
  })
})

describe("errors", () => {
  it("passes on service conflicts and not-found as-is", async () => {
    service.getKeyset.mockRejectedValue(vaultErrors.notFound("Vault keyset"))
    const notFound = await getKeyset(req("/keyset"))
    expect(notFound.status).toBe(404)

    service.deleteItem.mockRejectedValue(vaultErrors.conflict("Changed elsewhere."))
    const res = await deleteItem(req(`/items/${ITEM}`, { method: "DELETE" }), params(ITEM))
    expect(res.status).toBe(409)
    expect((await res.json()).error.message).toBe("Changed elsewhere.")
  })

  it("explains a missing Spring-era account row (23503) without a 500", async () => {
    service.createItem.mockRejectedValue(Object.assign(new Error("fk"), { code: "23503" }))
    const res = await postItem(
      req("/items", { method: "POST", body: { id: ITEM, payloadCiphertext: ENVELOPE } }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error.message).toContain("isn't set up for H-Vault")
  })

  it("answers 503 when Neon refuses for a used-up quota, without logging its message", async () => {
    // The exact wording Neon sent finance in production on 2026-11-21.
    const quota = new NeonDbError(
      'Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota. Upgrade your plan to increase limits."}',
    )
    service.getKeyset.mockRejectedValue(quota)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const res = await getKeyset(req("/keyset"))

    expect(res.status).toBe(503)
    expect((await res.json()).error).toEqual({
      code: "VAULT_DATABASE_UNAVAILABLE",
      message: "H-Vault is not available right now.",
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[vault] database unavailable"))
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Upgrade your plan")
  })

  it("hides database errors and doesn't log their message", async () => {
    const leak = `duplicate key value: (${ENVELOPE})`
    service.listItems.mockRejectedValue(Object.assign(new Error(leak), { code: "23505" }))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await getItems(req("/items"))

    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain(ENVELOPE)
    expect(log).toHaveBeenCalledWith(expect.stringContaining("23505"))
    expect(JSON.stringify(log.mock.calls)).not.toContain(ENVELOPE)
  })
})
