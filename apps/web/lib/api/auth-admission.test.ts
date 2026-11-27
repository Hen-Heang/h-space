/** @vitest-environment jsdom */

// Auth V2 admission inside sign-in (NEXT_PUBLIC_HSPACE_ADMISSION=enforce):
// checked after the first factor, before the code step and before the profile
// write; refused or unreadable → signed out, never "allowed". Synthetic ids.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const upsert = vi.hoisted(() => vi.fn())
const check = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
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
vi.mock("@/lib/api/admission", () => ({ admissionApi: { check } }))
vi.mock("@/lib/auth-v2", async (original) => ({
  ...(await original<typeof import("@/lib/auth-v2")>()),
  isAdmissionEnforced: () => true,
}))

import { ACCESS_DENIED_MESSAGE, ADMISSION_UNAVAILABLE_MESSAGE, AdmissionError } from "@/lib/auth-v2"
import { authApi } from "./auth"

const USER = {
  id: "11111111-0000-4000-8000-000000000001",
  email: "a@example.invalid",
  user_metadata: {},
}

beforeEach(() => {
  auth.signInWithPassword.mockResolvedValue({ error: null })
  auth.getSession.mockResolvedValue({ data: { session: { user: USER } } })
  auth.getUser.mockResolvedValue({ data: { user: USER }, error: null })
  auth.signOut.mockResolvedValue({ error: null })
  auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  })
  upsert.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe("sign-in with admission enforced", () => {
  it("ACC-01 / PROFILE-02: approved → MFA check → profile bootstrap, in that order", async () => {
    const order: string[] = []
    check.mockImplementation(async () => (order.push("admission"), "approved"))
    auth.mfa.getAuthenticatorAssuranceLevel.mockImplementation(async () => {
      order.push("mfa")
      return { data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }
    })
    upsert.mockImplementation(async () => (order.push("profile"), { error: null }))

    const result = await authApi.login({ email: USER.email, password: "pw" })

    expect(result).toEqual({ status: "signed_in", userId: USER.id, email: USER.email })
    expect(check).toHaveBeenCalledWith(USER.id)
    expect(order).toEqual(["admission", "mfa", "profile"])
  })

  it("ACC-02 / LOGIN-06: not admitted → signed out, generic message, no MFA step, no profile write", async () => {
    check.mockResolvedValue("denied")

    const error = await authApi.login({ email: USER.email, password: "pw" }).catch((e) => e)

    expect(error).toBeInstanceOf(AdmissionError)
    expect(error.message).toBe(ACCESS_DENIED_MESSAGE)
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it("ACC-06: authority unavailable → signed out with the retry message, never allowed", async () => {
    check.mockResolvedValue("unavailable")

    await expect(authApi.login({ email: USER.email, password: "pw" })).rejects.toThrow(
      ADMISSION_UNAVAILABLE_MESSAGE,
    )
    expect(auth.signOut).toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it("no session user id → unavailable, not admitted", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(authApi.login({ email: USER.email, password: "pw" })).rejects.toBeInstanceOf(
      AdmissionError,
    )
    expect(check).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it("MFA account: admitted → mfa_required; admission is re-checked after the code (ACC-07)", async () => {
    check.mockResolvedValue("approved")
    auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    })
    auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    })

    const first = await authApi.login({ email: USER.email, password: "pw" })
    expect(first).toEqual({ status: "mfa_required", factorId: "factor-1" })
    expect(upsert).not.toHaveBeenCalled()

    // Suspended between the password and the code: the code step doesn't let it through.
    check.mockResolvedValue("denied")
    auth.mfa.challengeAndVerify.mockResolvedValue({ error: null })
    await expect(authApi.verifyMfa("factor-1", "123456")).rejects.toBeInstanceOf(AdmissionError)
    expect(upsert).not.toHaveBeenCalled()
  })
})
