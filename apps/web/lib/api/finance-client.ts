// Thin fetch wrapper for the finance API (ported from Luyra's lib/api/client.ts).
// Finance components never call fetch() or a repository/service directly —
// they go through lib/api/finance.ts, which goes through here.
import { getSupabaseAccessToken, getUserId } from "@/lib/auth-store"

export interface ApiErrorBody {
  error: { code: string; message: string }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  const error = (body as { error?: unknown } | null | undefined)?.error
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string"
  )
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const userId = getUserId()
  const assertSameAccount = () => {
    if (!userId || getUserId() !== userId) {
      throw new ApiError("SESSION_CHANGED", "Your account changed. Please try again.", 401)
    }
  }
  assertSameAccount()
  // H-Space: the session lives in localStorage, not a cookie, so the bridged
  // Supabase token travels as a Bearer header — the same way app/api/ai/*
  // calls authenticate. requireFinanceUserId() verifies it on the server.
  const token = await getSupabaseAccessToken()
  assertSameAccount()
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  // A non-JSON body means something other than our route handler answered —
  // a login redirect, a proxy/CDN error page, or a platform timeout. Surface
  // it as a typed error with the status instead of an opaque SyntaxError.
  const body = await readJson(response)
  assertSameAccount()

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status)
    }
    throw new ApiError(
      "HTTP_ERROR",
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    )
  }

  if (body === undefined || typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError("INVALID_RESPONSE", `Unexpected response from ${path}`, response.status)
  }

  return (body as { data: T }).data
}

/**
 * Fetches a file (not a `{ data }` envelope) from a finance route with the
 * H-Space Bearer token, e.g. the transaction export. Returns the body and the
 * server's suggested filename. Same account-switch guard as apiFetch.
 */
export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const userId = getUserId()
  if (!userId) throw new ApiError("SESSION_CHANGED", "Your account changed. Please try again.", 401)
  const token = await getSupabaseAccessToken()
  if (getUserId() !== userId) {
    throw new ApiError("SESSION_CHANGED", "Your account changed. Please try again.", 401)
  }
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await readJson(response)
    if (isApiErrorBody(body))
      throw new ApiError(body.error.code, body.error.message, response.status)
    throw new ApiError(
      "HTTP_ERROR",
      `Download from ${path} failed with status ${response.status}`,
      response.status,
    )
  }
  const disposition = response.headers.get("content-disposition") ?? ""
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null
  return { blob: await response.blob(), filename }
}
