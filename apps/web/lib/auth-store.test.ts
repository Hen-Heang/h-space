/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearAuth,
  getSupabaseAccessToken,
  getUserId,
  getValidAccessToken,
  isAuthenticated,
  onAuthChange,
  saveSession,
} from "./auth-store"

const USER = { id: "user-1", email: "a@example.com", name: "A", imageUrl: null }

function envelope(data: unknown, init: { status?: number; code?: number; message?: string } = {}) {
  return new Response(
    JSON.stringify({
      status: { code: init.code ?? 200, message: init.message ?? "Success" },
      data,
    }),
    { status: init.status ?? 200, headers: { "Content-Type": "application/json" } },
  )
}

function stored() {
  return JSON.parse(window.localStorage.getItem("hspace-auth") ?? "null")
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("session", () => {
  it("is readable synchronously after saveSession and drops the legacy Supabase key", () => {
    window.localStorage.setItem("koriai-auth", "{}")
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)

    expect(isAuthenticated()).toBe(true)
    expect(getUserId()).toBe("user-1")
    expect(window.localStorage.getItem("koriai-auth")).toBeNull()
  })

  it("notifies listeners on sign-in and sign-out", async () => {
    const listener = vi.fn()
    const unsubscribe = onAuthChange(listener)
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    fetchMock.mockResolvedValueOnce(envelope(null))
    await clearAuth()
    unsubscribe()

    expect(listener).toHaveBeenCalledTimes(2)
    expect(isAuthenticated()).toBe(false)
  })

  it("revokes the refresh token on sign-out", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    fetchMock.mockResolvedValueOnce(envelope(null))
    await clearAuth()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/logout$/)
    expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: "r1" })
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer a1")
  })
})

describe("getValidAccessToken", () => {
  it("returns the stored token while it's fresh", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    expect(await getValidAccessToken()).toBe("a1")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refreshes once for concurrent callers when the token is about to expire", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 30 }, USER)
    fetchMock.mockResolvedValueOnce(
      envelope({ accessToken: "a2", refreshToken: "r2", expiresIn: 3600 }),
    )

    const [first, second] = await Promise.all([getValidAccessToken(), getValidAccessToken()])

    expect([first, second]).toEqual(["a2", "a2"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(stored().refreshToken).toBe("r2")
  })

  it("ends the session when the refresh token is rejected", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 30 }, USER)
    fetchMock.mockResolvedValueOnce(
      envelope(null, { status: 401, code: 1003, message: "Refresh token is expired." }),
    )

    expect(await getValidAccessToken()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it("keeps the session when the server is unreachable", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 30 }, USER)
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await expect(getValidAccessToken()).rejects.toThrow(/Can't reach/)
    expect(isAuthenticated()).toBe(true)
  })
})

describe("getSupabaseAccessToken", () => {
  it("is null when signed out, without calling the bridge", async () => {
    expect(await getSupabaseAccessToken()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("exchanges the access token at the bridge and caches the result", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    fetchMock.mockResolvedValueOnce(envelope({ accessToken: "sb1", expiresIn: 3600 }))

    expect(await getSupabaseAccessToken()).toBe("sb1")
    expect(await getSupabaseAccessToken()).toBe("sb1")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/supabase-token$/)
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer a1")
  })

  it("fetches a new token once the cached one is about to expire", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    fetchMock
      .mockResolvedValueOnce(envelope({ accessToken: "sb1", expiresIn: 30 }))
      .mockResolvedValueOnce(envelope({ accessToken: "sb2", expiresIn: 3600 }))

    expect(await getSupabaseAccessToken()).toBe("sb1")
    expect(await getSupabaseAccessToken()).toBe("sb2")
  })

  it("surfaces the bridge's error, e.g. when it isn't configured", async () => {
    saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
    fetchMock.mockResolvedValueOnce(
      envelope(null, { status: 503, code: 503, message: "The Supabase bridge isn't configured" }),
    )

    await expect(getSupabaseAccessToken()).rejects.toThrow(/bridge isn't configured/)
    expect(isAuthenticated()).toBe(true)
  })
})
