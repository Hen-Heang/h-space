// Browser-side client for Supabase Auth's OAuth 2.1 consent endpoints, used by
// /oauth/consent when an MCP connector (Claude, ChatGPT, ...) asks for access.
//
// Why not `supabase.auth.oauth.*`: lib/supabase.ts passes the h-space-api
// bridge token through supabase-js's `accessToken` option, which makes every
// `supabase.auth.*` call throw. These are the same two requests auth-js
// makes (GET /oauth/authorizations/{id}, POST .../consent), sent with the
// bridge token as the user JWT. Supabase Auth authenticates them like `/user`
// (`requireAuthentication` + user lookup, no session required) and binds the
// authorization to that user; consent by any other user is refused server-side.
//
// SPIKE: this ties MCP consent to the temporary token bridge. The bridge is
// used only to *approve* a request; the MCP access token is still issued by
// Supabase's OAuth server for the connector (its own aud/client_id), never the
// bridge token itself. When the bridge is removed, consent must move to
// h-space-api (Hen-Heang/h-space-api#36). Not a long-term design.
import { getSupabaseAccessToken } from "@/lib/auth-store"
import { assertSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase"

/** What Supabase returns for a pending request (subset the page uses). */
export interface ConsentAuthorizationDetails {
  authorization_id: string
  redirect_uri?: string
  scope?: string
  client: { id?: string; name?: string; uri?: string; logo_uri?: string }
  user?: { id?: string; email?: string }
}

/** Already decided (or auto-approved): Supabase hands back where to go. */
export interface ConsentRedirect {
  redirect_url: string
}

export type ConsentResult<T> = { data: T; error: null } | { data: null; error: string }

const GENERIC_ERROR = "This authorization request couldn't be loaded. It may have expired."
const SIGNED_OUT_ERROR =
  "Your session has ended. Sign in to H-Space, then start the connection again."

// Authorization ids are opaque server tokens; refuse anything that could
// change the request path before it is interpolated into a URL.
const AUTHORIZATION_ID = /^[A-Za-z0-9_-]{1,200}$/

export function isConsentRedirect(
  data: ConsentAuthorizationDetails | ConsentRedirect,
): data is ConsentRedirect {
  return typeof (data as ConsentRedirect).redirect_url === "string" && !("authorization_id" in data)
}

async function consentRequest<T>(
  method: "GET" | "POST",
  authorizationId: string,
  body?: { action: "approve" | "deny" },
): Promise<ConsentResult<T>> {
  if (!AUTHORIZATION_ID.test(authorizationId)) {
    return { data: null, error: "This authorization link is invalid." }
  }
  assertSupabaseConfigured()
  const token = await getSupabaseAccessToken()
  if (!token) return { data: null, error: SIGNED_OUT_ERROR }

  const path = `/auth/v1/oauth/authorizations/${authorizationId}${body ? "/consent" : ""}`
  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store",
    })
  } catch {
    return { data: null, error: "Couldn't reach the sign-in service. Check your connection." }
  }

  if (response.status === 401 || response.status === 403) {
    return { data: null, error: SIGNED_OUT_ERROR }
  }
  if (!response.ok) {
    // Server messages are short and non-sensitive ("authorization not found",
    // "no longer pending"); never echo the token or request back.
    const payload = (await response.json().catch(() => null)) as { msg?: unknown } | null
    const message = typeof payload?.msg === "string" && payload.msg ? payload.msg : GENERIC_ERROR
    return { data: null, error: message }
  }
  const data = (await response.json().catch(() => null)) as T | null
  return data ? { data, error: null } : { data: null, error: GENERIC_ERROR }
}

export function getConsentAuthorization(authorizationId: string) {
  return consentRequest<ConsentAuthorizationDetails | ConsentRedirect>("GET", authorizationId)
}

export function decideConsent(authorizationId: string, action: "approve" | "deny") {
  return consentRequest<ConsentRedirect>("POST", authorizationId, { action })
}

/** Only follow redirects Supabase returns as absolute http(s) URLs. */
export function safeConsentRedirect(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null
  } catch {
    return null
  }
}
