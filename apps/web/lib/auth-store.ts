// Auth state, backed by h-space-api (Spring Boot JWT auth — see
// lib/api/auth-http.ts). The session lives in localStorage so the exported
// getters stay synchronous for render-time guards and the many
// `requireUserId()` call sites; user ids are UUID strings, the same ids the
// Supabase tables reference (the accounts were imported with their ids).
//
// Data still lives in Supabase. Its RLS needs a Supabase-signed token, so
// getSupabaseAccessToken() exchanges our access token for a short-lived one at
// h-space-api's temporary bridge (POST /api/auth/supabase-token) and caches
// it here; lib/supabase.ts hands it to supabase-js via the `accessToken` option.
import { AuthApiError, authRequest } from "@/lib/api/auth-http"

const AUTH_STORAGE_KEY = "hspace-auth"
// The Supabase-auth session from before this migration. Nothing reads it any
// more; it's removed on the next sign-in or sign-out.
const LEGACY_SUPABASE_STORAGE_KEY = "koriai-auth"
const AUTH_CHANGE_EVENT = "hspace-auth-change"
const REFRESH_LOCK = "hspace-auth-refresh"

// Renew tokens this long before they expire, so a request never starts with
// a token that runs out in flight.
const EXPIRY_MARGIN_MS = 60_000

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  imageUrl: string | null
}

/** Shape of h-space-api's AuthResponse. */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  mfaRequired?: boolean
  mfaToken?: string | null
}

interface StoredAuth {
  accessToken: string
  refreshToken: string
  /** Epoch ms. */
  expiresAt: number
  user: AuthUser
  supabaseToken?: string
  /** Epoch ms. */
  supabaseTokenExpiresAt?: number
}

function readAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

function writeAuth(auth: StoredAuth, { notify = true } = {}) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  if (notify) window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

function clearLocalAuth() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_SUPABASE_STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function saveSession(tokens: AuthTokens, user: AuthUser) {
  window.localStorage.removeItem(LEGACY_SUPABASE_STORAGE_KEY)
  writeAuth({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user,
  })
}

/** Forgets the session locally without calling the server. */
export function discardSession() {
  clearLocalAuth()
}

/** Fires on sign-in, sign-out, a failed refresh, and the same in other tabs. */
export function onAuthChange(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === AUTH_STORAGE_KEY || e.key === null) callback()
  }
  window.addEventListener(AUTH_CHANGE_EVENT, callback)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback)
    window.removeEventListener("storage", onStorage)
  }
}

export function getToken(): string | null {
  return readAuth()?.accessToken ?? null
}

export function getUserId(): string | null {
  return readAuth()?.user.id ?? null
}

export function getUserEmail(): string | null {
  return readAuth()?.user.email ?? null
}

// True while a refresh token is held, even if the access token has lapsed —
// the next request renews it.
export function isAuthenticated(): boolean {
  return readAuth() != null
}

/** getUserId(), but throws instead of returning null — the common case in lib/api/*.ts writes. */
export function requireUserId(): string {
  const userId = getUserId()
  if (!userId) throw new Error("Not signed in")
  return userId
}

// h-space-api answers these when a refresh or access token is no longer
// accepted (revoked, expired, user deleted) — the session is over.
function isRejected(error: unknown): boolean {
  return (
    error instanceof AuthApiError &&
    (error.httpStatus === 400 || error.httpStatus === 401 || error.httpStatus === 403)
  )
}

// Refresh tokens rotate and h-space-api revokes the old one on use, so two
// tabs refreshing at once would sign each other out. The Web Locks API
// serializes refreshes across tabs; inside the lock, re-reading storage shows
// whether another tab already did the work.
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, fn) as Promise<T>
  }
  return fn()
}

let refreshInFlight: Promise<StoredAuth | null> | null = null

function refreshSession(staleRefreshToken: string): Promise<StoredAuth | null> {
  refreshInFlight ??= withRefreshLock(async () => {
    const current = readAuth()
    if (!current) return null
    if (current.refreshToken !== staleRefreshToken) return current

    try {
      const tokens = await authRequest<AuthTokens>("/api/auth/refresh", {
        method: "POST",
        body: { refreshToken: current.refreshToken },
      })
      const next: StoredAuth = {
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      }
      writeAuth(next, { notify: false })
      return next
    } catch (error) {
      // A network failure keeps the session for a later retry; a rejected
      // refresh token ends it.
      if (isRejected(error)) {
        clearLocalAuth()
        return null
      }
      throw error
    }
  }).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** The h-space-api access token, refreshed first if it's about to expire. */
export async function getValidAccessToken(): Promise<string | null> {
  const auth = readAuth()
  if (!auth) return null
  if (auth.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return auth.accessToken
  return (await refreshSession(auth.refreshToken))?.accessToken ?? null
}

let bridgeInFlight: Promise<string | null> | null = null

async function fetchSupabaseToken(): Promise<string | null> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return null
  try {
    const res = await authRequest<{ accessToken: string; expiresIn: number }>(
      "/api/auth/supabase-token",
      { method: "POST", token: accessToken },
    )
    const current = readAuth()
    if (!current) return null
    writeAuth(
      {
        ...current,
        supabaseToken: res.accessToken,
        supabaseTokenExpiresAt: Date.now() + res.expiresIn * 1000,
      },
      { notify: false },
    )
    return res.accessToken
  } catch (error) {
    if (error instanceof AuthApiError && error.httpStatus === 401) {
      clearLocalAuth()
      return null
    }
    throw error
  }
}

/**
 * A Supabase-signed token for the signed-in user (RLS sees the same user id),
 * or null when signed out. Cached until shortly before it expires.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const auth = readAuth()
  if (!auth) return null
  if (auth.supabaseToken && (auth.supabaseTokenExpiresAt ?? 0) - EXPIRY_MARGIN_MS > Date.now()) {
    return auth.supabaseToken
  }
  bridgeInFlight ??= fetchSupabaseToken().finally(() => {
    bridgeInFlight = null
  })
  return bridgeInFlight
}

/** Revokes the session server-side (best effort) and forgets it locally. */
export async function clearAuth() {
  const auth = readAuth()
  clearLocalAuth()
  if (!auth) return
  try {
    await authRequest("/api/auth/logout", {
      method: "POST",
      body: { refreshToken: auth.refreshToken },
      token: auth.accessToken,
    })
  } catch {
    // Already signed out locally; an unreachable server only means the
    // refresh token lives until it expires.
  }
}
