import { AuthApiError, HSPACE_API_URL, authRequest } from "@/lib/api/auth-http"
import { getValidAccessToken, refreshAccessToken } from "@/lib/auth-store"

// Signed-in requests to hspace-api, the Spring service H-Space data is moving
// into from Supabase (one area at a time, see lib/feature-flags.ts). Unwraps
// the same ApiResponse envelope as authRequest.
//
// A 401 means the access token itself was refused (expired early, revoked):
// renew it once and retry. A second 401 is final — refreshSession() has
// already signed the user out if the refresh token was refused too.

// h-space-api ExitCodes for a refused token. A 401 from the security filter
// has no envelope at all, so no code is treated the same way.
const TOKEN_EXPIRED = 1004
const TOKEN_INVALID = 1005

function isRefusedToken(error: unknown): boolean {
  return (
    error instanceof AuthApiError &&
    error.httpStatus === 401 &&
    (error.code === undefined || error.code === TOKEN_EXPIRED || error.code === TOKEN_INVALID)
  )
}

export async function hspaceRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) throw new AuthApiError("Your session has ended. Sign in again to continue.", 401)
  try {
    return await authRequest<T>(path, { ...options, token, baseUrl: HSPACE_API_URL })
  } catch (error) {
    if (!isRefusedToken(error)) throw error
    const renewed = await refreshAccessToken()
    if (!renewed) throw error
    return authRequest<T>(path, { ...options, token: renewed, baseUrl: HSPACE_API_URL })
  }
}
