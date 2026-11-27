import { getSupabaseAccessToken } from "@/lib/auth-store"
import {
  HubApiError,
  networkError,
  parseHubSession,
  resolveHubApiConfig,
  unwrapHubEnvelope,
  type HubSession,
} from "@/lib/auth-v2"

// Typed client for h-space-api's Auth V2 pilot (docs/auth-v2.md there):
// GET /api/hub/session and /api/hub/inbox-items. Off unless
// NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring and NEXT_PUBLIC_AUTHV2_API_URL are
// set (lib/auth-v2.ts). Sends the browser's own Supabase access token as a
// bearer header - never a cookie, never a service key - and never logs it.

type Fetch = typeof fetch

export type HubRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  body?: unknown
}

/**
 * One request to the pilot. 401 means the session is over; callers decide
 * whether to sign out. Bodies are JSON both ways; errors become HubApiError.
 */
export async function hubRequest<T>(
  request: HubRequest,
  deps: { fetch?: Fetch; token?: () => Promise<string | null>; baseUrl?: string } = {},
): Promise<T> {
  const baseUrl = deps.baseUrl ?? requireBaseUrl()
  const token = await (deps.token ?? getSupabaseAccessToken)()
  if (!token) throw new HubApiError("unauthorized", 401, "Your session ended. Sign in again.", null)

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }
  if (request.body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await (deps.fetch ?? fetch)(`${baseUrl}${request.path}`, {
      method: request.method ?? "GET",
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
    })
  } catch {
    throw networkError()
  }

  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  return unwrapHubEnvelope<T>(response.status, json)
}

function requireBaseUrl(): string {
  const config = resolveHubApiConfig()
  if (!config.enabled) throw new Error("The h-space-api Auth V2 pilot is not enabled.")
  return config.baseUrl
}

export const hubSessionApi = {
  /** The caller's admitted session (aal1 allowed). */
  get: async (deps?: Parameters<typeof hubRequest>[1]): Promise<HubSession> =>
    parseHubSession(await hubRequest<unknown>({ path: "/api/hub/session" }, deps)),
}
