import { HSPACE_API_URL, HSPACE_TOKEN_HEADER, authRequest } from "@/lib/api/auth-http"
import type { InboxItem } from "@/lib/inbox"
import type { InboxSearchRow } from "@/lib/server/memory-retrieval"

// Server-side inbox search against hspace-api for AI routes, once the inbox
// has moved off Supabase (isSpringInboxEnabled). Those routes authenticate
// the caller with the Supabase bridge token; hspace-api needs the caller's
// own h-space-api access token, which the browser sends alongside it as
// HSPACE_TOKEN_HEADER (lib/api/ai-client.ts) — only to this app's routes.
// hspace-api checks that token itself, so a forged header gets nothing.

/** A search scoped to the token's user, or undefined without a token. */
export function hspaceInboxSearch(
  req: Request,
): ((query: string, limit: number) => Promise<InboxSearchRow[]>) | undefined {
  const token = req.headers.get(HSPACE_TOKEN_HEADER)
  if (!token) return undefined
  return async (query, limit) => {
    const params = new URLSearchParams({ q: query, limit: String(limit), status: "all" })
    const items =
      (await authRequest<InboxItem[]>(`/api/v1/inbox-items?${params}`, {
        token,
        baseUrl: HSPACE_API_URL,
      })) ?? []
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      item_type: item.itemType,
    }))
  }
}
