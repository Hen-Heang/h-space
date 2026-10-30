/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ assertSupabaseConfigured: vi.fn(), supabase: {} }))

import { authApi } from "./auth"

const fetchMock = vi.fn<typeof fetch>()

function ok(data: unknown) {
  return new Response(JSON.stringify({ status: { code: 200, message: "Success" }, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const input = {
  email: "jane@example.com",
  password: "Password123!",
  username: "jane",
  displayName: "Jane",
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("authApi.register", () => {
  it("asks for email verification when sign-up issues no tokens", async () => {
    fetchMock.mockResolvedValueOnce(ok({ emailVerificationRequired: true }))

    const result = await authApi.register(input)

    expect(result).toEqual({ userId: null, email: input.email, needsEmailConfirmation: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/signup$/)
  })

  it("revokes tokens an older API still returns from sign-up", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }))
      .mockResolvedValueOnce(ok(null))

    const result = await authApi.register(input)

    expect(result.needsEmailConfirmation).toBe(true)
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toMatch(/\/api\/auth\/logout$/)
    expect(JSON.parse(init?.body as string)).toEqual({ refreshToken: "r1" })
  })
})
