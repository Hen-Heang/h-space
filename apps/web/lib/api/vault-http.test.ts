import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const token = vi.hoisted(() => ({ value: "access-token" as string | null }))
vi.mock("@/lib/auth-store", () => ({ getSupabaseAccessToken: async () => token.value }))

import { VaultHttpError, vaultRequest } from "./vault-http"

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  token.value = "access-token"
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe("vaultRequest", () => {
  it("calls this app's /api/vault with the session token, uncached", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: 1 }))
    await expect(vaultRequest("/items", { method: "POST", body: { id: "x" } })).resolves.toEqual({
      ok: 1,
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/vault/items")
    expect(init).toMatchObject({ method: "POST", cache: "no-store", body: '{"id":"x"}' })
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer access-token")
  })

  it("sends nothing when signed out", async () => {
    token.value = null
    await expect(vaultRequest("/items")).rejects.toMatchObject({ httpStatus: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("surfaces the route's error code and message", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { code: "VAULT_MFA_REQUIRED", message: "Turn on two-step verification." } },
        { status: 403 },
      ),
    )
    const error = await vaultRequest("/keyset").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(VaultHttpError)
    expect(error).toMatchObject({
      httpStatus: 403,
      code: "VAULT_MFA_REQUIRED",
      message: "Turn on two-step verification.",
    })
  })

  it("reports a network failure as status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await expect(vaultRequest("/items")).rejects.toMatchObject({ httpStatus: 0 })
  })
})
