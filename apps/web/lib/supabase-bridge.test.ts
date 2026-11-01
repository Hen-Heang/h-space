import { beforeEach, describe, expect, it, vi } from "vitest"

let userId: string | null = "user-1"
const authRequest = vi.fn()

vi.mock("@/lib/auth-store", () => ({ getUserId: () => userId }))
vi.mock("./api/auth-http", () => ({ authRequest: (...args: unknown[]) => authRequest(...args) }))

const { clearSupabaseAccessToken, getSupabaseAccessToken } = await import("./supabase-bridge")

describe("Supabase bridge token", () => {
  let now = 1_000_000

  beforeEach(() => {
    userId = "user-1"
    now = 1_000_000
    authRequest.mockReset()
    clearSupabaseAccessToken()
  })

  const clock = () => now

  it("is null when signed out, without calling the auth service", async () => {
    userId = null
    expect(await getSupabaseAccessToken(clock)).toBeNull()
    expect(authRequest).not.toHaveBeenCalled()
  })

  it("exchanges once, then reuses the token until shortly before it expires", async () => {
    authRequest.mockResolvedValue({ accessToken: "sb-1", expiresIn: 3600 })

    expect(await getSupabaseAccessToken(clock)).toBe("sb-1")
    now += 3_000_000 // 50 minutes later: still more than a minute left
    expect(await getSupabaseAccessToken(clock)).toBe("sb-1")
    expect(authRequest).toHaveBeenCalledTimes(1)
    expect(authRequest).toHaveBeenCalledWith("/api/auth/supabase-token", { auth: true })

    authRequest.mockResolvedValue({ accessToken: "sb-2", expiresIn: 3600 })
    now += 560_000 // under a minute left
    expect(await getSupabaseAccessToken(clock)).toBe("sb-2")
    expect(authRequest).toHaveBeenCalledTimes(2)
  })

  it("shares one exchange between concurrent callers", async () => {
    authRequest.mockResolvedValue({ accessToken: "sb-1", expiresIn: 3600 })

    const tokens = await Promise.all([
      getSupabaseAccessToken(clock),
      getSupabaseAccessToken(clock),
      getSupabaseAccessToken(clock),
    ])

    expect(tokens).toEqual(["sb-1", "sb-1", "sb-1"])
    expect(authRequest).toHaveBeenCalledTimes(1)
  })

  it("never hands one user's token to another", async () => {
    authRequest.mockResolvedValueOnce({ accessToken: "sb-user-1", expiresIn: 3600 })
    await getSupabaseAccessToken(clock)

    userId = "user-2"
    authRequest.mockResolvedValueOnce({ accessToken: "sb-user-2", expiresIn: 3600 })
    expect(await getSupabaseAccessToken(clock)).toBe("sb-user-2")
  })

  it("surfaces a failed exchange and retries on the next call", async () => {
    authRequest.mockRejectedValueOnce(new Error("bridge not configured"))
    await expect(getSupabaseAccessToken(clock)).rejects.toThrow("bridge not configured")

    authRequest.mockResolvedValueOnce({ accessToken: "sb-1", expiresIn: 3600 })
    expect(await getSupabaseAccessToken(clock)).toBe("sb-1")
  })
})
