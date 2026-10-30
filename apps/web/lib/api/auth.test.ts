/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const upsertMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase", () => ({
  assertSupabaseConfigured: vi.fn(),
  supabase: { from: () => ({ upsert: upsertMock }) },
}))

import { getUserId } from "@/lib/auth-store"
import { authApi, PROFILE_LOAD_FAILED } from "./auth"

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
  upsertMock.mockReset()
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

describe("authApi.login", () => {
  const tokens = { accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }
  const user = { id: "u1", name: "Jane", email: input.email, imageUrl: null }

  it("signs in once the profile is in place", async () => {
    fetchMock.mockResolvedValueOnce(ok(tokens)).mockResolvedValueOnce(ok(user))
    upsertMock.mockResolvedValueOnce({ error: null })

    const result = await authApi.login({ identifier: "jane", password: input.password })

    expect(result).toEqual({ status: "signed_in", userId: "u1", email: input.email })
    expect(getUserId()).toBe("u1")
  })

  // supabase-js returns a plain object, not an Error, when its token callback
  // fails (e.g. h-space-api's bridge answers 503).
  it("says the data couldn't load, not that the password was wrong", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(tokens))
      .mockResolvedValueOnce(ok(user))
      .mockResolvedValueOnce(ok(null))
    const supabaseError = {
      message: "AuthApiError: Service unavailable",
      details: "",
      hint: "",
      code: "",
    }
    upsertMock.mockResolvedValueOnce({ error: supabaseError })

    const failure = authApi.login({ identifier: "jane", password: input.password })

    await expect(failure).rejects.toThrow(PROFILE_LOAD_FAILED)
    await expect(failure).rejects.toMatchObject({ cause: supabaseError })
    expect(getUserId()).toBeNull()

    // The undone sign-in is revoked server-side, not just forgotten locally.
    const [url, init] = fetchMock.mock.calls[2]
    expect(url).toMatch(/\/api\/auth\/logout$/)
    expect(JSON.parse(init?.body as string)).toEqual({ refreshToken: "r1" })
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer a1")
  })

  it("still reports the failure when the revoke call can't reach the server", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(tokens))
      .mockResolvedValueOnce(ok(user))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    upsertMock.mockResolvedValueOnce({ error: { message: "boom" } })

    await expect(authApi.login({ identifier: "jane", password: input.password })).rejects.toThrow(
      PROFILE_LOAD_FAILED,
    )
    expect(getUserId()).toBeNull()
  })
})
