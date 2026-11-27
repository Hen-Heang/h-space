import type { User } from "@supabase/supabase-js"

import { admissionApi } from "@/lib/api/admission"
import { clearAuth, forgetLegacySession } from "@/lib/auth-store"
import { AdmissionError, isAdmissionEnforced } from "@/lib/auth-v2"
import { assertSupabaseConfigured, supabase } from "@/lib/supabase"

// Auth over Supabase Auth (see lib/auth-store.ts for the session itself).
// Three ways in: email + password, a 6-digit code emailed for "Email code",
// and Google. Each gives an aal1 session; an account with a verified
// authenticator then answers mfa_required and finishes with verifyMfa().
//
// H-Space has no self sign-up: the email code never creates an account
// (shouldCreateUser: false), and new people are added by the owner in the
// Supabase dashboard (docs/SPRING_EXIT_PLAN.md).

export type SignInResult =
  | { status: "signed_in"; userId: string; email: string }
  /** First factor accepted; finish with verifyMfa(factorId, code). */
  | { status: "mfa_required"; factorId: string }

export const PROFILE_LOAD_FAILED =
  "You signed in, but H-Space couldn't load your data, so you've been signed out. Try again in a moment."

/** Supabase's answer to an email code for an address with no account. */
export function isNoAccountOtpError(error: { code?: string; message?: string }): boolean {
  return error.code === "otp_disabled" || /signups not allowed/i.test(error.message ?? "")
}

function metadataString(user: User, ...keys: string[]): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

// Creates the kori_profiles row on first sign-in; an existing row is left as is.
async function ensureProfile(user: User) {
  const { error } = await supabase.from("kori_profiles").upsert(
    {
      id: user.id,
      display_name: metadataString(user, "display_name", "full_name", "name"),
      korean_level: "BEGINNER",
      avatar_url: metadataString(user, "avatar_url", "picture"),
    },
    { onConflict: "id", ignoreDuplicates: true },
  )
  if (error) throw error
}

/**
 * The authenticator to verify when the current session still needs its
 * second step (aal1 with a verified factor), else null.
 */
async function pendingMfaFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  if (data.nextLevel !== "aal2" || data.currentLevel === "aal2") return null
  const factors = await supabase.auth.mfa.listFactors()
  if (factors.error) throw factors.error
  const factor = factors.data.totp.find((f) => f.status === "verified")
  return factor?.id ?? null
}

/**
 * Auth V2 admission (only when NEXT_PUBLIC_HSPACE_ADMISSION=enforce): right
 * after the first factor, before the code step and before any profile write.
 * Not admitted, or the answer can't be read: sign out and stop - never a
 * fallback to "allowed".
 */
async function requireAdmission(): Promise<void> {
  if (!isAdmissionEnforced()) return
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  const admission = userId ? await admissionApi.check(userId) : "unavailable"
  if (admission === "approved") return
  await clearAuth()
  throw new AdmissionError(admission)
}

async function completeSignIn(): Promise<SignInResult> {
  forgetLegacySession()
  await requireAdmission()
  const factorId = await pendingMfaFactorId()
  if (factorId) return { status: "mfa_required", factorId }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error("Sign-in failed. Try again.")
  const user = data.user

  // The first data call also proves RLS accepts the session; if it doesn't,
  // undo the sign-in rather than leave the user in an app that can't load.
  // supabase-js reports a failure as a plain { message, ... } object, not an
  // Error, so say what happened instead of "Invalid login credentials".
  try {
    await ensureProfile(user)
  } catch (error) {
    await clearAuth()
    throw new Error(PROFILE_LOAD_FAILED, { cause: error })
  }
  return { status: "signed_in", userId: user.id, email: user.email ?? "" }
}

export const authApi = {
  login: async (input: { email: string; password: string }): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    })
    if (error) throw error
    return completeSignIn()
  },

  // "Email code", step 1. Never creates an account. For an address without
  // one Supabase answers "Signups not allowed for otp"; that's swallowed so
  // the form answers the same either way and doesn't reveal who has an
  // account (the page doesn't promise a code was sent).
  requestEmailCode: async (email: string) => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    if (error && !isNoAccountOtpError(error)) throw error
  },

  // Step 2: the code from the email signs in.
  verifyEmailCode: async (email: string, code: string): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    })
    if (error) throw error
    return completeSignIn()
  },

  /** Second step of a sign-in that answered mfa_required: a 6-digit authenticator code. */
  verifyMfa: async (factorId: string, code: string): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s+/g, ""),
    })
    if (error) throw error
    return completeSignIn()
  },

  /**
   * A half-finished sign-in left in this browser (first factor done, code not
   * yet entered) — the login page resumes it at the code step.
   */
  pendingMfa: async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    return pendingMfaFactorId()
  },

  // Google Identity Services ID token → Supabase session. The Google provider
  // (with the same client ID) must be enabled under Supabase Auth > Providers.
  // `nonce` is the raw value whose SHA-256 Google embedded in the token;
  // Supabase checks they match, so a captured token can't be replayed.
  loginWithGoogle: async (idToken: string, nonce?: string): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce,
    })
    if (error) throw error
    return completeSignIn()
  },

  /**
   * Finishes a sign-in whose session was set by a redirect (the optional
   * GitHub flow, app/auth/callback): the same admission, code step and
   * profile bootstrap as every other method - nothing is skipped.
   */
  completeRedirectSignIn: async (): Promise<SignInResult> => {
    assertSupabaseConfigured()
    return completeSignIn()
  },

  logout: async () => {
    await clearAuth()
  },

  // Emails a reset link. It lands on /reset-password, where supabase-js's
  // detectSessionInUrl turns it into a short recovery session.
  requestPasswordReset: async (email: string) => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  // Sets a new password on the current (recovery) session. Supabase refuses
  // this for an account with an authenticator until the session is aal2, so
  // /reset-password asks for the code first (verifyMfa).
  updatePassword: async (newPassword: string) => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },
}
