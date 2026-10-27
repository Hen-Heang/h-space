import { authRequest } from "@/lib/api/auth-http"
import {
  type AuthTokens,
  type AuthUser,
  clearAuth,
  discardSession,
  saveSession,
} from "@/lib/auth-store"
import { assertSupabaseConfigured, supabase } from "@/lib/supabase"

// Auth over h-space-api (see lib/auth-store.ts for the session itself).
// Three ways in: email-or-username + password, a 6-digit code emailed for
// "continue with email" (which also signs up a new address), and Google.
// h-space-api only knows name/username/email/password, so the onboarding
// answers from signup are kept in localStorage until the first sign-in, when
// ensureProfile() writes them into kori_profiles. Password signup never signs
// in: h-space-api requires the email to be verified first.

export interface RegisterInput {
  email: string
  password: string
  /** Second sign-in identifier; see lib/username.ts for the rules. */
  username: string
  displayName: string
  koreanLevel?: string
  country?: string
  nativeLanguage?: string
  occupation?: string
  yearsOfExperience?: number
  learningGoal?: string
}

export type SignInResult =
  | { status: "signed_in"; userId: string; email: string }
  /** Password was right; finish with verifyMfa(mfaToken, code). */
  | { status: "mfa_required"; mfaToken: string }

/** Shape of h-space-api's UserResponse. */
interface UserResponse {
  id: string
  name: string | null
  email: string | null
  imageUrl: string | null
}

type PendingProfile = Omit<RegisterInput, "email" | "password">

const pendingProfileKey = (email: string) => `hspace-pending-profile:${email.trim().toLowerCase()}`

function savePendingProfile(input: RegisterInput) {
  const { email, ...rest } = input
  const profile: PendingProfile & { password?: string } = { ...rest }
  delete profile.password
  try {
    window.localStorage.setItem(pendingProfileKey(email), JSON.stringify(profile))
  } catch {
    // Storage unavailable: the profile gets defaults and onboarding fills it in.
  }
}

function takePendingProfile(email: string | null): PendingProfile | null {
  if (!email) return null
  try {
    const raw = window.localStorage.getItem(pendingProfileKey(email))
    return raw ? (JSON.parse(raw) as PendingProfile) : null
  } catch {
    return null
  }
}

// Creates the kori_profiles row on first sign-in; an existing row is left as is.
async function ensureProfile(user: UserResponse) {
  const pending = takePendingProfile(user.email)
  const { error } = await supabase.from("kori_profiles").upsert(
    {
      id: user.id,
      display_name: pending?.displayName ?? user.name ?? null,
      korean_level: pending?.koreanLevel ?? "BEGINNER",
      country: pending?.country ?? null,
      native_language: pending?.nativeLanguage ?? null,
      occupation: pending?.occupation ?? null,
      years_of_experience: pending?.yearsOfExperience ?? null,
      learning_goal: pending?.learningGoal ?? null,
      avatar_url: user.imageUrl ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  )
  if (error) throw error
  if (pending && user.email) window.localStorage.removeItem(pendingProfileKey(user.email))
}

async function completeSignIn(tokens: AuthTokens): Promise<SignInResult> {
  if (tokens.mfaRequired) {
    if (!tokens.mfaToken)
      throw new Error("Two-step verification is required but no challenge was issued.")
    return { status: "mfa_required", mfaToken: tokens.mfaToken }
  }

  const user = await authRequest<UserResponse>("/api/auth/user", { token: tokens.accessToken })
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
  }
  saveSession(tokens, authUser)

  // The first Supabase call also proves the data bridge works; if it doesn't,
  // undo the sign-in rather than leave the user in an app that can't load.
  try {
    await ensureProfile(user)
  } catch (error) {
    discardSession()
    throw error
  }
  return { status: "signed_in", userId: user.id, email: user.email ?? "" }
}

export const authApi = {
  register: async (input: RegisterInput) => {
    assertSupabaseConfigured()
    savePendingProfile(input)
    const tokens = await authRequest<AuthTokens>("/api/auth/signup", {
      method: "POST",
      body: {
        name: input.displayName,
        email: input.email,
        password: input.password,
        username: input.username,
      },
    })
    // Signup returns tokens, but the account can't sign in until its email is
    // verified — revoke them rather than keep a session that skips that step.
    await authRequest("/api/auth/logout", {
      method: "POST",
      body: { refreshToken: tokens.refreshToken },
      token: tokens.accessToken,
    }).catch(() => undefined)
    return { userId: null, email: input.email, needsEmailConfirmation: true }
  },

  /** `identifier` is an email or a username. */
  login: async (input: { identifier: string; password: string }): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const tokens = await authRequest<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: input,
    })
    return completeSignIn(tokens)
  },

  isUsernameAvailable: async (username: string): Promise<boolean> => {
    const res = await authRequest<{ available: boolean }>(
      `/api/auth/username-available?username=${encodeURIComponent(username)}`,
    )
    return res?.available === true
  },

  // "Continue with email", step 1: h-space-api emails a 6-digit code. It
  // answers OK even when it skips a resend inside its 60s cooldown.
  requestEmailCode: async (email: string) => {
    assertSupabaseConfigured()
    await authRequest("/api/auth/email-code/request", { method: "POST", body: { email } })
  },

  // Step 2: signs in — creating the account first if the address is new.
  verifyEmailCode: async (email: string, code: string): Promise<SignInResult> => {
    const tokens = await authRequest<AuthTokens>("/api/auth/email-code/verify", {
      method: "POST",
      body: { email, code },
    })
    return completeSignIn(tokens)
  },

  // Second step of a login that answered mfa_required. `code` is a 6-digit
  // authenticator code or a backup code.
  verifyMfa: async (mfaToken: string, code: string): Promise<SignInResult> => {
    const tokens = await authRequest<AuthTokens>("/api/auth/mfa/verify", {
      method: "POST",
      body: { mfaToken, code },
    })
    return completeSignIn(tokens)
  },

  // Google Identity Services ID token → h-space-api session. h-space-api
  // verifies the token's signature, issuer, audience and expiry, but doesn't
  // take a nonce, so there's no replay check on the nonce Google embeds.
  loginWithGoogle: async (idToken: string): Promise<SignInResult> => {
    assertSupabaseConfigured()
    const tokens = await authRequest<AuthTokens>("/api/auth/oauth2/google", {
      method: "POST",
      body: { idToken },
    })
    return completeSignIn(tokens)
  },

  logout: async () => {
    await clearAuth()
  },

  // h-space-api emails a link to /reset-password?token=…. It answers the
  // same way whether or not the address has an account.
  requestPasswordReset: async (email: string) => {
    await authRequest("/api/auth/forgot-password", { method: "POST", body: { email } })
  },

  validateResetToken: async (token: string): Promise<boolean> => {
    const res = await authRequest<{ valid: boolean }>(
      `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
    )
    return res?.valid === true
  },

  // h-space-api emails /verify-email?token=… after password sign-up; a
  // password login is refused until this succeeds. (An email code also
  // verifies the address, as a fallback.)
  verifyEmail: async (token: string) => {
    await authRequest("/api/auth/verify-email", { method: "POST", body: { token } })
  },

  // Answers OK whether or not the address has an unverified account.
  resendVerification: async (email: string) => {
    await authRequest("/api/auth/resend-verification", { method: "POST", body: { email } })
  },

  // h-space-api locks an account after repeated failed logins and emails
  // /unlock-account?token=…; the lock also lifts on its own after a while.
  unlockAccount: async (token: string) => {
    await authRequest("/api/auth/unlock-account", { method: "POST", body: { token } })
  },

  resendUnlockLink: async (email: string) => {
    await authRequest("/api/auth/resend-unlock-link", { method: "POST", body: { email } })
  },

  resetPassword: async (token: string, newPassword: string) => {
    await authRequest("/api/auth/reset-password", {
      method: "POST",
      body: { token, newPassword },
    })
  },
}
