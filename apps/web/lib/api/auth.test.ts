/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const upsert = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithIdToken: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  mfa: {
    getAuthenticatorAssuranceLevel: vi.fn(),
    listFactors: vi.fn(),
    challengeAndVerify: vi.fn(),
  },
}))

vi.mock("@/lib/supabase", () => ({
  SUPABASE_STORAGE_KEY: "koriai-auth",
  assertSupabaseConfigured: vi.fn(),
  supabase: { auth, from: () => ({ upsert }) },
}))

import { authApi, isNoAccountOtpError, PROFILE_LOAD_FAILED } from "./auth"

const USER = { id: "user-1", email: "jane@example.com", user_metadata: { full_name: "Jane" } }

function aal(currentLevel: string, nextLevel: string) {
  auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel, nextLevel },
    error: null,
  })
}

beforeEach(() => {
  aal("aal1", "aal1")
  auth.getUser.mockResolvedValue({ data: { user: USER }, error: null })
  auth.signOut.mockResolvedValue({ error: null })
  upsert.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe("authApi.login", () => {
  it("signs in and creates the profile row if it's missing", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: null })
    window.localStorage.setItem("hspace-auth", "{}")

    const result = await authApi.login({ email: " jane@example.com ", password: "pw" })

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "pw",
    })
    expect(result).toEqual({ status: "signed_in", userId: "user-1", email: "jane@example.com" })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", display_name: "Jane", korean_level: "BEGINNER" }),
      { onConflict: "id", ignoreDuplicates: true },
    )
    expect(window.localStorage.getItem("hspace-auth")).toBeNull()
  })

  it("throws Supabase's error for wrong credentials", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      error: new Error("Invalid login credentials"),
    })
    await expect(authApi.login({ email: "a@b.c", password: "x" })).rejects.toThrow(
      "Invalid login credentials",
    )
    expect(upsert).not.toHaveBeenCalled()
  })

  it("asks for the authenticator code instead of signing in when one is verified", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: null })
    aal("aal1", "aal2")
    auth.mfa.listFactors.mockResolvedValueOnce({
      data: {
        totp: [
          { id: "old", status: "unverified" },
          { id: "factor-1", status: "verified" },
        ],
      },
      error: null,
    })

    const result = await authApi.login({ email: "a@b.c", password: "pw" })

    expect(result).toEqual({ status: "mfa_required", factorId: "factor-1" })
    expect(upsert).not.toHaveBeenCalled()
  })

  it("signs back out when the profile can't be loaded", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: null })
    upsert.mockResolvedValueOnce({ error: { message: "permission denied" } })

    await expect(authApi.login({ email: "a@b.c", password: "pw" })).rejects.toThrow(
      PROFILE_LOAD_FAILED,
    )
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" })
  })
})

describe("authApi.verifyMfa", () => {
  it("verifies the code and finishes signing in", async () => {
    auth.mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    aal("aal2", "aal2")

    const result = await authApi.verifyMfa("factor-1", " 123 456 ")

    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: "factor-1",
      code: "123456",
    })
    expect(result.status).toBe("signed_in")
  })

  it("throws for a wrong code", async () => {
    auth.mfa.challengeAndVerify.mockResolvedValueOnce({ error: new Error("Invalid TOTP code") })
    await expect(authApi.verifyMfa("factor-1", "000000")).rejects.toThrow("Invalid TOTP code")
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe("authApi.pendingMfa", () => {
  it("is null without a session", async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null } })
    await expect(authApi.pendingMfa()).resolves.toBeNull()
  })

  it("returns the factor a half-finished sign-in still owes", async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: { access_token: "t" } } })
    aal("aal1", "aal2")
    auth.mfa.listFactors.mockResolvedValueOnce({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    })
    await expect(authApi.pendingMfa()).resolves.toBe("factor-1")
  })
})

describe("email code", () => {
  it("never creates an account", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: null })
    await authApi.requestEmailCode(" a@b.c ")
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "a@b.c",
      options: { shouldCreateUser: false },
    })
  })

  it("answers the same for an address with no account", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({
      error: { code: "otp_disabled", message: "Signups not allowed for otp" },
    })
    await expect(authApi.requestEmailCode("nobody@b.c")).resolves.toBeUndefined()
  })

  it("still reports other failures, like rate limits", async () => {
    auth.signInWithOtp.mockResolvedValueOnce({
      error: { code: "over_email_send_rate_limit", message: "Too many requests" },
    })
    await expect(authApi.requestEmailCode("a@b.c")).rejects.toMatchObject({
      message: "Too many requests",
    })
  })

  it("verifies the code as an email OTP", async () => {
    auth.verifyOtp.mockResolvedValueOnce({ error: null })
    await authApi.verifyEmailCode("a@b.c", " 123456 ")
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.c", token: "123456", type: "email" })
  })

  it("recognises the no-account answer", () => {
    expect(isNoAccountOtpError({ code: "otp_disabled" })).toBe(true)
    expect(isNoAccountOtpError({ message: "Signups not allowed for otp" })).toBe(true)
    expect(isNoAccountOtpError({ code: "otp_expired", message: "Token has expired" })).toBe(false)
  })
})

describe("authApi.loginWithGoogle", () => {
  it("passes the raw nonce so Supabase can check the token's hash", async () => {
    auth.signInWithIdToken.mockResolvedValueOnce({ error: null })
    await authApi.loginWithGoogle("id-token", "raw-nonce")
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "id-token",
      nonce: "raw-nonce",
    })
  })
})

describe("password reset", () => {
  it("sends the link back to this origin's reset page", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
    await authApi.requestPasswordReset("a@b.c")
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.c", {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })

  it("surfaces a refused password change", async () => {
    auth.updateUser.mockResolvedValueOnce({ error: new Error("AAL2 required") })
    await expect(authApi.updatePassword("NewPassword1!")).rejects.toThrow("AAL2 required")
  })
})
