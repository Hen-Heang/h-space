// HTTP client for h-space-api, the Spring Boot auth service. Every response
// is wrapped in its ApiResponse envelope — { status: { code, message }, data }
// — with code 200 on success; this unwraps `data` or throws AuthApiError.
// Deliberately free of auth-store/supabase imports so both can depend on it.

export const AUTH_API_URL =
  (process.env.NEXT_PUBLIC_AUTH_API_URL ?? "").trim().replace(/\/+$/, "") || "http://localhost:8080"

// hspace-api, where H-Space data moves as it leaves Supabase
// (h-space-api docs/spring-migration-plan.md). It accepts the same tokens and
// answers in the same envelope; the same server as AUTH_API_URL unless set.
export const HSPACE_API_URL =
  (process.env.NEXT_PUBLIC_HSPACE_API_URL ?? "").trim().replace(/\/+$/, "") || AUTH_API_URL

// Carries the caller's h-space-api access token to this app's own AI routes
// (lib/api/ai-client.ts), for data they read from hspace-api rather than
// Supabase. Never sent to any other origin.
export const HSPACE_TOKEN_HEADER = "x-hspace-token"

const SUCCESS_CODE = 200
const LEGACY_SYSTEM_ERROR = 5000

export class AuthApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never got a response. */
    readonly httpStatus: number,
    /** h-space-api's own status code (ExitCode / StatusCode), when present. */
    readonly code?: number,
  ) {
    super(message)
    this.name = "AuthApiError"
  }
}

type Envelope<T> = {
  status?: { code?: number; message?: string }
  data?: T
}

export async function authRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: unknown
    token?: string | null
    /** Defaults to AUTH_API_URL. */
    baseUrl?: string
  } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${options.baseUrl ?? AUTH_API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new AuthApiError(
      "Can't reach the H-Space sign-in service. Check your connection and try again.",
      0,
    )
  }

  const envelope = (await res.json().catch(() => null)) as Envelope<T> | null
  const code = envelope?.status?.code
  if (!res.ok || (code !== undefined && code !== SUCCESS_CODE)) {
    // Builds before the error-envelope fix sent every auth error as code 5000
    // "System error" with the real message in `data`; prefer that one.
    const message =
      code === LEGACY_SYSTEM_ERROR && typeof envelope?.data === "string"
        ? envelope.data
        : envelope?.status?.message
    throw new AuthApiError(message || `Request failed (${res.status})`, res.status, code)
  }
  return envelope?.data as T
}
