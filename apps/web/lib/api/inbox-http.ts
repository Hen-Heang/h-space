import type { InboxConversionTarget, InboxItem, InboxItemInput } from "@/lib/inbox"

import { hubRequest, type HubRequest } from "./hub-http"
import type { InboxListParams, InboxItemPatch, InboxStore } from "./inbox"

// The Inbox over h-space-api's Auth V2 pilot (/api/hub/inbox-items), the same
// InboxStore contract as the Supabase store in ./inbox.ts. Selected only when
// NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring (opt-in; P1 cutover isn't approved).
//
// Contract notes (vault note 05): create and delete answer 200 with the
// envelope (not 201/204); there is no version field or 409; PATCH sends only
// the fields being changed, with an explicit null to clear a nullable one.
// The server needs admission + aal2 and scopes everything to the token's user.

type Send = <T>(request: HubRequest) => Promise<T>

const BASE = "/api/hub/inbox-items"

/** The server's response shape is the app's InboxItem; normalise the optional arrays/nulls. */
function toInboxItem(raw: InboxItem): InboxItem {
  return {
    id: raw.id,
    title: raw.title ?? null,
    content: raw.content,
    itemType: raw.itemType,
    tags: raw.tags ?? [],
    capturedAt: raw.capturedAt,
    eventAt: raw.eventAt ?? null,
    goalId: raw.goalId ?? null,
    status: raw.status,
    source: raw.source,
    pinned: Boolean(raw.pinned),
    convertedToType: raw.convertedToType ?? null,
    convertedToId: raw.convertedToId ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

/** Only the keys present in the patch are sent; undefined is dropped, null is kept (clears). */
export function patchBody(patch: InboxItemPatch): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) body[key] = value
  }
  return body
}

export function listPath(params: InboxListParams): string {
  const query = new URLSearchParams()
  if (params.status && params.status !== "all") query.set("status", params.status)
  if (params.itemType && params.itemType !== "all") query.set("itemType", params.itemType)
  query.set("limit", String(params.limit ?? 500))
  return `${BASE}?${query.toString()}`
}

export function createInboxHttpStore(send: Send = (r) => hubRequest(r)): InboxStore {
  return {
    list: async (params) => (await send<InboxItem[]>({ path: listPath(params) })).map(toInboxItem),

    get: async (id) =>
      toInboxItem(await send<InboxItem>({ path: `${BASE}/${encodeURIComponent(id)}` })),

    create: async (input: InboxItemInput) =>
      toInboxItem(
        await send<InboxItem>({
          method: "POST",
          path: BASE,
          // Same defaults as the Supabase store; id, owner, status and
          // timestamps are the server's.
          body: {
            title: input.title?.trim() || null,
            content: input.content.trim(),
            itemType: input.itemType,
            tags: input.tags ?? [],
            eventAt: input.eventAt ?? null,
            goalId: input.goalId ?? null,
            source: input.source ?? "manual",
          },
        }),
      ),

    update: async (id, patch) =>
      toInboxItem(
        await send<InboxItem>({
          method: "PATCH",
          path: `${BASE}/${encodeURIComponent(id)}`,
          body: patchBody(patch),
        }),
      ),

    remove: async (id) => {
      await send<unknown>({ method: "DELETE", path: `${BASE}/${encodeURIComponent(id)}` })
    },

    // Like the Supabase store, a failure to stamp the source is not surfaced:
    // the conversion itself already succeeded and the item stays visible.
    markConverted: async (id, type: InboxConversionTarget, convertedId?: string) => {
      try {
        await send<unknown>({
          method: "PATCH",
          path: `${BASE}/${encodeURIComponent(id)}`,
          body: {
            convertedToType: type,
            ...(convertedId !== undefined ? { convertedToId: convertedId } : {}),
            status: "processed",
          },
        })
      } catch {
        /* see above */
      }
    },
  }
}
