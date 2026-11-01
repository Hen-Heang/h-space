import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const authStore = vi.hoisted(() => ({
  getValidAccessToken: vi.fn<() => Promise<string | null>>(),
  refreshAccessToken: vi.fn<() => Promise<string | null>>(),
}))
vi.mock("@/lib/auth-store", () => authStore)

import { AuthApiError, HSPACE_API_URL } from "./auth-http"
import { hspaceRequest } from "./hspace-http"

function json(body: unknown, status: number) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const ok = (data: unknown) => json({ status: { code: 200, message: "Success" }, data }, 200)

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)
  authStore.getValidAccessToken.mockResolvedValue("access-1")
  authStore.refreshAccessToken.mockResolvedValue("access-2")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const bearer = (call: number) =>
  (fetchMock.mock.calls[call][1]?.headers as Record<string, string>).Authorization

describe("hspaceRequest", () => {
  it("calls hspace-api with the access token and unwraps data", async () => {
    fetchMock.mockResolvedValue(ok([{ id: "a" }]))

    await expect(hspaceRequest("/api/v1/inbox-items")).resolves.toEqual([{ id: "a" }])
    expect(fetchMock.mock.calls[0][0]).toBe(`${HSPACE_API_URL}/api/v1/inbox-items`)
    expect(bearer(0)).toBe("Bearer access-1")
    expect(authStore.refreshAccessToken).not.toHaveBeenCalled()
  })

  it("renews the token once and retries after a bare 401 from the security filter", async () => {
    fetchMock.mockResolvedValueOnce(json(null, 401)).mockResolvedValueOnce(ok({ id: "a" }))

    await expect(
      hspaceRequest("/api/v1/inbox-items/a", { method: "PATCH", body: { pinned: true } }),
    ).resolves.toEqual({ id: "a" })
    expect(authStore.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(bearer(1)).toBe("Bearer access-2")
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH")
  })

  it("retries after TOKEN_EXPIRED", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: { code: 1004, message: "expired" } }, 401))
      .mockResolvedValueOnce(ok([]))

    await expect(hspaceRequest("/api/v1/inbox-items")).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("doesn't retry a 401 that isn't about the token", async () => {
    fetchMock.mockResolvedValue(json({ status: { code: 1008, message: "Invalid code" } }, 401))

    await expect(hspaceRequest("/api/v1/inbox-items")).rejects.toMatchObject({ code: 1008 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(authStore.refreshAccessToken).not.toHaveBeenCalled()
  })

  it("gives up after one retry", async () => {
    fetchMock.mockResolvedValue(json(null, 401))

    await expect(hspaceRequest("/api/v1/inbox-items")).rejects.toMatchObject({ httpStatus: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("doesn't retry when the session can't be renewed", async () => {
    fetchMock.mockResolvedValue(json(null, 401))
    authStore.refreshAccessToken.mockResolvedValue(null)

    await expect(hspaceRequest("/api/v1/inbox-items")).rejects.toBeInstanceOf(AuthApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refuses without a session, before calling the server", async () => {
    authStore.getValidAccessToken.mockResolvedValue(null)

    await expect(hspaceRequest("/api/v1/inbox-items")).rejects.toMatchObject({ httpStatus: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("passes 404s through untouched", async () => {
    fetchMock.mockResolvedValue(
      json({ status: { code: 40400, message: "Inbox item not found" } }, 404),
    )

    await expect(hspaceRequest("/api/v1/inbox-items/x")).rejects.toMatchObject({
      httpStatus: 404,
      message: "Inbox item not found",
    })
    expect(authStore.refreshAccessToken).not.toHaveBeenCalled()
  })
})
