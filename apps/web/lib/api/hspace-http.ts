import { AuthApiError } from "@/lib/api/auth-http"

// Signed-in requests to hspace-api, the Spring service being retired
// (docs/SPRING_EXIT_PLAN.md). Sign-in moved to Supabase Auth on 2026-11-21,
// so there is no h-space-api token any more and nothing is sent: every call
// fails with 503 and a plain message. Its one live caller, H-Vault, moves to
// a Vercel route over Neon in step 3 of that plan; the Spring inbox path is
// off once NEXT_PUBLIC_DATA_SOURCE_INBOX is unset.

export const HSPACE_UNAVAILABLE_MESSAGE =
  "This part of H-Space is moving to a new server and is temporarily unavailable. Your data is safe."

export async function hspaceRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  void path
  void options
  throw new AuthApiError(HSPACE_UNAVAILABLE_MESSAGE, 503)
}
