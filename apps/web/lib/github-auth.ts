import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { authApi, type SignInResult } from "@/lib/api/auth"
import { isGitHubSignInEnabled } from "@/lib/auth-v2"
import { safeNextPath } from "@/lib/safe-next-path"
import { assertSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL, supabase } from "@/lib/supabase"

// Optional "Continue with GitHub" (Auth V2 G1, decision H15). OFF unless
// NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN=true, and even then it only works once
// the operator has configured the GitHub provider and redirect URLs in
// Supabase (h-space-api docs/auth-v2.md). Not verified against real GitHub.
//
// PKCE without touching the app's main client: that client stays on its
// current flow, so password-reset links (detectSessionInUrl) and the Google
// nonce flow keep working exactly as before. A second, isolated client with
// its OWN storage key starts the redirect and keeps the code verifier in
// localStorage across it; the callback exchanges the code with that same
// client, hands the session to the main client, and deletes its own entries.
// Scopes: none requested beyond the provider default (no repo access).

export const GITHUB_PKCE_STORAGE_KEY = "koriai-auth-github-pkce"
export const GITHUB_SIGN_IN_FAILED =
  "GitHub sign-in didn't finish. It may have been cancelled or the link expired. Try again."

let pkceClient: SupabaseClient | null = null

function githubClient(): SupabaseClient {
  pkceClient ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      flowType: "pkce",
      storageKey: GITHUB_PKCE_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return pkceClient
}

/** The app callback Supabase sends the browser back to (not GitHub's own callback URL). */
export function githubCallbackUrl(origin: string, next: string | null): string {
  const safe = safeNextPath(next)
  return `${origin}/auth/callback${safe ? `?next=${encodeURIComponent(safe)}` : ""}`
}

export type GitHubCallback =
  { kind: "code"; code: string; next: string | null } | { kind: "error" } | { kind: "missing" }

/**
 * Reads /auth/callback's query. A provider error is reported generically -
 * its text isn't shown, so the URL can't put words in the app's mouth.
 * `next` survives only as a same-site path (safeNextPath).
 */
export function parseGitHubCallback(search: string): GitHubCallback {
  const params = new URLSearchParams(search)
  const next = safeNextPath(params.get("next"))
  if (params.get("error") || params.get("error_description")) return { kind: "error" }
  const code = params.get("code")?.trim()
  if (!code || code.length > 512 || !/^[A-Za-z0-9._~-]+$/.test(code)) return { kind: "missing" }
  return { kind: "code", code, next }
}

function forgetPkceEntries() {
  try {
    window.localStorage.removeItem(GITHUB_PKCE_STORAGE_KEY)
    window.localStorage.removeItem(`${GITHUB_PKCE_STORAGE_KEY}-code-verifier`)
    window.localStorage.removeItem(`${GITHUB_PKCE_STORAGE_KEY}-user`)
  } catch {
    /* storage unavailable: nothing to clean */
  }
}

/** Starts the redirect to GitHub (via Supabase). Off: throws. */
export async function startGitHubSignIn(next: string | null): Promise<void> {
  if (!isGitHubSignInEnabled()) throw new Error("GitHub sign-in isn't enabled.")
  assertSupabaseConfigured()
  const { error } = await githubClient().auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: githubCallbackUrl(window.location.origin, next) },
  })
  if (error) throw new Error(GITHUB_SIGN_IN_FAILED)
}

/**
 * Exchanges the one-time code (needs the verifier this browser stored when it
 * started), moves the session to the main client, and finishes through the
 * same path as every other sign-in: admission, code step, profile bootstrap.
 * A reused/expired code or a missing verifier fails and leaves no session.
 */
export async function finishGitHubSignIn(code: string): Promise<SignInResult> {
  if (!isGitHubSignInEnabled()) throw new Error("GitHub sign-in isn't enabled.")
  assertSupabaseConfigured()
  try {
    const { data, error } = await githubClient().auth.exchangeCodeForSession(code)
    if (error || !data.session) throw new Error(GITHUB_SIGN_IN_FAILED)
    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (setError) throw new Error(GITHUB_SIGN_IN_FAILED)
  } catch {
    forgetPkceEntries()
    throw new Error(GITHUB_SIGN_IN_FAILED)
  }
  forgetPkceEntries()
  return authApi.completeRedirectSignIn()
}
