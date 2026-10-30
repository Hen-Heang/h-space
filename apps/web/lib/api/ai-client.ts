import { HSPACE_TOKEN_HEADER } from "@/lib/api/auth-http"
import { getSupabaseAccessToken, getValidAccessToken } from "@/lib/auth-store"
import { isSpringInboxEnabled } from "@/lib/feature-flags"

// Shared with the SSE routes (chat.ts streamMessage, goals.ts coachStream) so
// there's one place that attaches the caller's Supabase access token — the
// bridge-issued one, since requireUser (lib/server/ai.ts) checks it against
// Supabase and runs the route's queries under RLS with it.
//
// Once an area has moved to hspace-api (today: the inbox), the route also
// needs the caller's h-space-api token to read it there, so that rides along
// as HSPACE_TOKEN_HEADER. These are same-origin requests to this app only.
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  if (isSpringInboxEnabled()) {
    const hspaceToken = await getValidAccessToken()
    if (hspaceToken) headers[HSPACE_TOKEN_HEADER] = hspaceToken
  }
  return headers
}

// Helper for the AI features that used to run on the Spring backend and now
// live in Next.js route handlers under app/api/ai/*. Attaches the Supabase
// access token; the route verifies it before spending AI credits.
export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/ai${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `AI request failed (${res.status})`)
  }
  return (await res.json()) as T
}
