// Optional one-way export of Quick Capture items to Notion
// (app/api/integrations/notion/capture).
import { getSupabaseAccessToken } from "@/lib/auth-store"
import type { InboxItemType } from "@/lib/inbox"

export interface NotionCaptureInput {
  title: string | null
  content: string
  tags: string[]
  itemType: InboxItemType
}

// Every route under app/api/integrations/* is a normal requireUser route (like
// the AI routes), so it needs the caller's Supabase access token as a bearer
// header — supabase-js doesn't attach this to same-origin fetches on its own
// the way it does to its own PostgREST calls.
async function authedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const accessToken = await getSupabaseAccessToken()
  if (!accessToken) return null
  return fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  })
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  const json = await res.json().catch(() => null)
  return new Error(typeof json?.error === "string" ? json.error : fallback)
}

export const integrationsApi = {
  // Optional one-way export for Quick Capture. Hengo remains the source of
  // truth; Notion is a secondary copy only when the personal integration is
  // explicitly enabled in deployment settings.
  notionCaptureEnabled: process.env.NEXT_PUBLIC_NOTION_CAPTURE_ENABLED === "true",

  syncCaptureToNotion: async (input: NotionCaptureInput): Promise<{ url: string | null }> => {
    const res = await authedFetch("/api/integrations/notion/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res) throw new Error("Notion sync requires an active Hengo session.")
    if (!res.ok) throw await responseError(res, "Could not sync this capture to Notion.")
    return res.json()
  },
}
