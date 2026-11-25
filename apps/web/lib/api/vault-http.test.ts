import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const token = vi.hoisted(() => ({ value: "access-token" as string | null }))
vi.mock("@/lib/auth-store", () => ({ getSupabaseAccessToken: async () => token.value }))

import { setVaultStepUpPrompt, VaultHttpError, vaultRequest } from "./vault-http"

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

describe("vaultRequest — step-up", () => {
  const stepUpRequired = () =>
    Response.json(
      { error: { code: "VAULT_STEP_UP_REQUIRED", message: "Enter a code." } },
      { status: 403 },
    )
  let unregister: (() => void) | null = null
  afterEach(() => {
    unregister?.()
    unregister = null
  })

  it("asks for a code, then retries once with the refreshed session token", async () => {
    const prompt = vi.fn(async () => {
      token.value = "fresh-token" // challengeAndVerify refreshed the session
      return true
    })
    unregister = setVaultStepUpPrompt(prompt)
    fetchMock.mockResolvedValueOnce(stepUpRequired()).mockResolvedValueOnce(Response.json({}))

    await expect(
      vaultRequest("/reset", { method: "POST", body: { confirm: "RESET" } }),
    ).resolves.toEqual({})
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retry = fetchMock.mock.calls[1][1]!
    expect((retry.headers as Record<string, string>).Authorization).toBe("Bearer fresh-token")
    expect(retry.body).toBe('{"confirm":"RESET"}')
  })

  it("gives up without retrying when the user cancels", async () => {
    unregister = setVaultStepUpPrompt(async () => false)
    fetchMock.mockResolvedValueOnce(stepUpRequired())
    await expect(vaultRequest("/reset", { method: "POST" })).rejects.toMatchObject({
      httpStatus: 403,
      code: "VAULT_STEP_UP_REQUIRED",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("never loops: a second refusal is returned as-is", async () => {
    const prompt = vi.fn(async () => true)
    unregister = setVaultStepUpPrompt(prompt)
    fetchMock.mockResolvedValueOnce(stepUpRequired()).mockResolvedValueOnce(stepUpRequired())
    await expect(vaultRequest("/reset", { method: "POST" })).rejects.toMatchObject({
      code: "VAULT_STEP_UP_REQUIRED",
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("doesn't prompt for other errors, or when no prompt is mounted", async () => {
    const prompt = vi.fn(async () => true)
    unregister = setVaultStepUpPrompt(prompt)
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { code: "VAULT_RATE_LIMITED", message: "Later." } }, { status: 429 }),
    )
    await expect(vaultRequest("/reset", { method: "POST" })).rejects.toMatchObject({
      httpStatus: 429,
    })
    expect(prompt).not.toHaveBeenCalled()

    unregister()
    unregister = null
    fetchMock.mockResolvedValueOnce(stepUpRequired())
    await expect(vaultRequest("/reset", { method: "POST" })).rejects.toMatchObject({
      code: "VAULT_STEP_UP_REQUIRED",
    })
    expect(prompt).not.toHaveBeenCalled()
  })
})
