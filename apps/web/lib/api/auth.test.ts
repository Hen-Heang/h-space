/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const upsert = vi.fn()

vi.mock("@/lib/supabase", () => ({
  IS_SUPABASE_CONFIGURED: true,
  assertSupabaseConfigured: () => undefined,
  supabase: { from: () => ({ upsert }) },
}))

import { isAuthenticated } from "@/lib/auth-store"

import { authApi } from "./auth"

const TOKENS = { accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }
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

function respondTo(routes: Record<string, () => Response>) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname
    const route = routes[path]
    if (!route) throw new Error(`Unexpected request to ${path}`)
    return route()
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  upsert.mockReset()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("authApi.login", () => {
  it("signs in without the Supabase profile when h-space-api's bridge is off", async () => {
    respondTo({
      "/api/auth/login": () => envelope(TOKENS),
      "/api/auth/user": () => envelope(USER),
      "/api/auth/supabase-token": () =>
        envelope("The Supabase bridge isn't configured", {
          status: 503,
          code: 50301,
          message: "Service unavailable",
        }),
    })

    const result = await authApi.login({ identifier: "a", password: "pw" })

    expect(result).toEqual({ status: "signed_in", userId: "user-1", email: "a@example.com" })
    expect(isAuthenticated()).toBe(true)
    expect(upsert).not.toHaveBeenCalled()
  })

  it("still undoes the sign-in when the bridge fails for another reason", async () => {
    respondTo({
      "/api/auth/login": () => envelope(TOKENS),
      "/api/auth/user": () => envelope(USER),
      "/api/auth/supabase-token": () =>
        envelope(null, { status: 500, code: 50001, message: "Internal error" }),
    })

    await expect(authApi.login({ identifier: "a", password: "pw" })).rejects.toThrow()
    expect(isAuthenticated()).toBe(false)
  })

  it("writes the profile when the bridge works", async () => {
    upsert.mockResolvedValue({ error: null })
    respondTo({
      "/api/auth/login": () => envelope(TOKENS),
      "/api/auth/user": () => envelope(USER),
      "/api/auth/supabase-token": () => envelope({ accessToken: "s1", expiresIn: 3600 }),
    })

    const result = await authApi.login({ identifier: "a", password: "pw" })

    expect(result.status).toBe("signed_in")
    expect(upsert).toHaveBeenCalledTimes(1)
  })
})
