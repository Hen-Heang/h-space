// Temporary bridge while H-Space's data moves from Supabase to the Spring
// backend. Supabase RLS only trusts tokens signed for the Supabase project, so
// the Spring auth service exchanges its own access token for a short-lived
// Supabase-compatible one (POST /api/auth/supabase-token, same user UUID).
// lib/supabase.ts hands it to supabase-js, and authHeaders() sends it to the
// app/api/* routes, which forward it to Supabase.
//
// Delete this file — and the backend endpoint — once no lib/api/* domain
// queries Supabase.
import { getUserId } from "@/lib/auth-store"
import { authRequest } from "./api/auth-http"

interface BridgeToken {
  accessToken: string
  expiresAt: number
  userId: string
}

// Refresh this long before expiry so a request in flight never carries a
// token that lapses on the way.
const EXPIRY_MARGIN_MS = 60_000

let cached: BridgeToken | null = null
let pending: Promise<string | null> | null = null

/**
 * The Supabase access token for the signed-in user, or null when signed out
 * (supabase-js then falls back to the publishable key, i.e. anonymous).
 * Throws when the exchange fails, e.g. the bridge isn't configured (503) or
 * the email belongs to a not-yet-imported pre-migration account (409).
 */
export async function getSupabaseAccessToken(now: () => number = Date.now): Promise<string | null> {
  const userId = getUserId()
  if (!userId) {
    cached = null
    return null
  }
  if (cached && cached.userId === userId && cached.expiresAt - EXPIRY_MARGIN_MS > now()) {
    return cached.accessToken
  }

  pending ??= (async () => {
    try {
      const response = await authRequest<{ accessToken: string; expiresIn: number }>(
        "/api/auth/supabase-token",
        { auth: true },
      )
      cached = {
        accessToken: response.accessToken,
        expiresAt: now() + response.expiresIn * 1000,
        userId,
      }
      return cached.accessToken
    } finally {
      pending = null
    }
  })()
  return pending
}

/** Forget the cached token — on sign-out, so the next user never reuses it. */
export function clearSupabaseAccessToken() {
  cached = null
}
