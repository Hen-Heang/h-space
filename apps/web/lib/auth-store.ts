// Auth state, backed by the Supabase Auth session. supabase-js persists it in
// localStorage under SUPABASE_STORAGE_KEY and refreshes it itself; this module
// reads that entry synchronously so render-time guards and the many
// `requireUserId()` call sites stay synchronous. User ids are the Supabase
// auth UUIDs every table references.
//
// Two-step verification: a password, email code or Google sign-in gives an
// `aal1` session. For an account with a verified authenticator that session is
// only half signed in — isAuthenticated() stays false until the code has been
// entered and the session is `aal2` (lib/api/auth.ts verifyMfa). This is the
// app's gate; database-side enforcement is tracked in docs/SPRING_EXIT_PLAN.md.
import { SUPABASE_STORAGE_KEY, supabase } from "@/lib/supabase"

// The h-space-api (Spring) session from before 2026-11-21. Nothing reads it any
// more; it's removed on the next sign-in or sign-out.
const LEGACY_SPRING_STORAGE_KEY = "hspace-auth"
const AUTH_CHANGE_EVENT = "hspace-auth-change"

interface StoredFactor {
  id?: string
  factor_type?: string
  status?: string
}

interface StoredSession {
  access_token?: string
  refresh_token?: string
  user?: {
    id?: string
    email?: string | null
    factors?: StoredFactor[] | null
  }
}

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SUPABASE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

/** The `aal` claim of a Supabase access token, or null if it can't be read. */
export function tokenAal(token: string | undefined | null): string | null {
  const payload = token?.split(".")[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const claims = JSON.parse(atob(padded)) as { aal?: unknown }
    return typeof claims.aal === "string" ? claims.aal : null
  } catch {
    return null
  }
}

/** True when the account has a verified authenticator but this session hasn't used it yet. */
export function needsMfa(session: StoredSession | null): boolean {
  if (!session?.access_token) return false
  const hasVerifiedFactor = (session.user?.factors ?? []).some((f) => f.status === "verified")
  return hasVerifiedFactor && tokenAal(session.access_token) !== "aal2"
}

function notify() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

/** Fires on sign-in, sign-out, an ended session, and the same in other tabs. */
export function onAuthChange(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SUPABASE_STORAGE_KEY || e.key === null) callback()
  }
  window.addEventListener(AUTH_CHANGE_EVENT, callback)
  window.addEventListener("storage", onStorage)
  // Covers supabase-js's own events: a refresh that failed (SIGNED_OUT), an
  // MFA step completed (MFA_CHALLENGE_VERIFIED), and other tabs via its
  // BroadcastChannel. The callback must stay synchronous — calling
  // supabase.auth.* from inside this listener can deadlock auth-js.
  const { data } = supabase.auth.onAuthStateChange(() => callback())
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback)
    window.removeEventListener("storage", onStorage)
    data.subscription.unsubscribe()
  }
}

export function getUserId(): string | null {
  const session = readSession()
  return session?.access_token ? (session.user?.id ?? null) : null
}

export function getUserEmail(): string | null {
  return readSession()?.user?.email ?? null
}

// True while a session is held (supabase-js renews an expired access token on
// the next request) and any two-step verification has been completed.
export function isAuthenticated(): boolean {
  const session = readSession()
  return Boolean(session?.access_token && session.user?.id) && !needsMfa(session)
}

/** getUserId(), but throws instead of returning null — the common case in lib/api/*.ts writes. */
export function requireUserId(): string {
  const userId = getUserId()
  if (!userId) throw new Error("Not signed in")
  return userId
}

/**
 * The signed-in user's Supabase access token (refreshed first if it has
 * expired), or null when signed out. Sent to this app's own route handlers,
 * which verify it with requireUser (lib/server/ai.ts).
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/** Removes the Spring-era session entry, if one is still there. */
export function forgetLegacySession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LEGACY_SPRING_STORAGE_KEY)
}

/**
 * Signs this browser out: revokes this session server-side (other devices
 * stay signed in) and always forgets it locally, even when Supabase can't be
 * reached.
 */
export async function clearAuth() {
  if (typeof window === "undefined") return
  forgetLegacySession()
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" })
    if (error) window.localStorage.removeItem(SUPABASE_STORAGE_KEY)
  } catch {
    window.localStorage.removeItem(SUPABASE_STORAGE_KEY)
  }
  notify()
}
