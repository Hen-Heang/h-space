import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import { resolveHubApiConfig } from "@/lib/auth-v2"
import {
  buildJournalConversionPayload,
  buildNoteConversionPayload,
  buildTaskConversionPayload,
  type InboxConversionTarget,
  type InboxItem,
  type InboxItemInput,
  type InboxItemStatus,
  type InboxItemType,
} from "@/lib/inbox"

import { notesApi } from "./notes"
import { tasksApi } from "./goals"
import { journalApi } from "./journal"
import { createInboxHttpStore } from "./inbox-http"

// Quick Capture Inbox. Mirrors the notesApi shape: plain async functions,
// requireUserId() on Supabase writes.
//
// Storage is Supabase's kori_inbox_items, owner-scoped by RLS. A second,
// hspace-api (Spring) store existed behind NEXT_PUBLIC_DATA_SOURCE_INBOX
// until the Spring API was retired on 2026-11-21 (docs/SPRING_EXIT_PLAN.md);
// the InboxStore seam is kept so a future store can slot in the same way.
//
// Auth V2 pilot: NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=spring (with
// NEXT_PUBLIC_AUTHV2_API_URL) selects h-space-api's /api/hub/inbox-items over
// the Supabase session token instead (./inbox-http.ts). Off by default: that
// store holds different rows until an approved, reconciled copy (P1).

export interface InboxListParams {
  status?: InboxItemStatus | "all"
  itemType?: InboxItemType | "all"
  /** Bounded fetch, mirroring the rest of lib/api/* (personal-scale data, not paginated yet). */
  limit?: number
}

export type InboxItemPatch = Partial<{
  title: string | null
  content: string
  itemType: InboxItemType
  tags: string[]
  eventAt: string | null
  goalId: string | null
  pinned: boolean
  status: InboxItemStatus
}>

export interface InboxStore {
  list(params: InboxListParams): Promise<InboxItem[]>
  get(id: string): Promise<InboxItem>
  create(input: InboxItemInput): Promise<InboxItem>
  update(id: string, patch: InboxItemPatch): Promise<InboxItem>
  remove(id: string): Promise<void>
  /** Stamps the source item as processed once it has been converted. */
  markConverted(id: string, type: InboxConversionTarget, convertedId?: string): Promise<void>
}

// ─── Supabase ───────────────────────────────────────────────────────────────

type InboxItemRow = {
  id: string
  title: string | null
  content: string
  item_type: InboxItemType
  tags: string[]
  captured_at: string
  event_at: string | null
  goal_id: string | null
  status: InboxItemStatus
  source: InboxItem["source"]
  pinned: boolean
  converted_to_type: InboxConversionTarget | null
  converted_to_id: string | null
  created_at: string
  updated_at: string
}

const SELECT_COLUMNS =
  "id, title, content, item_type, tags, captured_at, event_at, goal_id, status, source, pinned, converted_to_type, converted_to_id, created_at, updated_at"

function toInboxItem(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    itemType: row.item_type,
    tags: row.tags ?? [],
    capturedAt: row.captured_at,
    eventAt: row.event_at,
    goalId: row.goal_id,
    status: row.status,
    source: row.source,
    pinned: row.pinned,
    convertedToType: row.converted_to_type,
    convertedToId: row.converted_to_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const supabaseInbox: InboxStore = {
  list: async (params) => {
    let query = supabase
      .from("kori_inbox_items")
      .select(SELECT_COLUMNS)
      .order("captured_at", { ascending: false })
      .limit(params.limit ?? 500)
    if (params.status && params.status !== "all") query = query.eq("status", params.status)
    if (params.itemType && params.itemType !== "all") query = query.eq("item_type", params.itemType)
    const { data, error } = await query
    if (error) throw error
    return (data as unknown as InboxItemRow[]).map(toInboxItem)
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from("kori_inbox_items")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single()
    if (error) throw error
    return toInboxItem(data as unknown as InboxItemRow)
  },

  create: async (input) => {
    const { data, error } = await supabase
      .from("kori_inbox_items")
      .insert({
        user_id: requireUserId(),
        title: input.title?.trim() || null,
        content: input.content.trim(),
        item_type: input.itemType,
        tags: input.tags ?? [],
        event_at: input.eventAt ?? null,
        goal_id: input.goalId ?? null,
        source: input.source ?? "manual",
      })
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toInboxItem(data as unknown as InboxItemRow)
  },

  update: async (id, patch) => {
    const { data, error } = await supabase
      .from("kori_inbox_items")
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.itemType !== undefined ? { item_type: patch.itemType } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.eventAt !== undefined ? { event_at: patch.eventAt } : {}),
        ...(patch.goalId !== undefined ? { goal_id: patch.goalId } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return toInboxItem(data as unknown as InboxItemRow)
  },

  remove: async (id) => {
    const { error } = await supabase.from("kori_inbox_items").delete().eq("id", id)
    if (error) throw error
  },

  markConverted: async (id, type, convertedId) => {
    await supabase
      .from("kori_inbox_items")
      .update({
        converted_to_type: type,
        ...(convertedId !== undefined ? { converted_to_id: convertedId } : {}),
        status: "processed",
      })
      .eq("id", id)
  },
}

let httpInbox: InboxStore | null = null

const store = (): InboxStore => {
  if (!resolveHubApiConfig().enabled) return supabaseInbox
  httpInbox ??= createInboxHttpStore()
  return httpInbox
}

export const inboxApi = {
  list: (params: InboxListParams = {}): Promise<InboxItem[]> => store().list(params),

  get: (id: string): Promise<InboxItem> => store().get(id),

  create: (input: InboxItemInput): Promise<InboxItem> => store().create(input),

  update: (id: string, patch: InboxItemPatch): Promise<InboxItem> => store().update(id, patch),

  remove: (id: string): Promise<void> => store().remove(id),

  togglePinned: async (id: string, pinned: boolean): Promise<InboxItem> =>
    inboxApi.update(id, { pinned }),

  archive: async (id: string): Promise<InboxItem> => inboxApi.update(id, { status: "archived" }),

  restore: async (id: string): Promise<InboxItem> => inboxApi.update(id, { status: "inbox" }),

  // ── Conversions — explicit, never delete the source item. ──────────────────

  /** Converts an inbox item into a new Note, stamping the source as processed. */
  convertToNote: async (item: InboxItem): Promise<{ slug: string }> => {
    const existing = await notesApi.list()
    const payload = buildNoteConversionPayload(
      item,
      existing.map((n) => n.slug),
    )
    await notesApi.create(payload)
    await store().markConverted(item.id, "note")
    return { slug: payload.slug }
  },

  /** Converts an inbox item into a new Task scheduled on `date` (YYYY-MM-DD). */
  convertToTask: async (item: InboxItem, date: string): Promise<{ id: string }> => {
    const payload = buildTaskConversionPayload(item, date)
    const task = await tasksApi.create(payload)
    await store().markConverted(item.id, "task", task.id)
    return { id: task.id }
  },

  /** Converts an inbox item into a new Journal entry. */
  convertToJournal: async (item: InboxItem): Promise<{ id: string }> => {
    const payload = buildJournalConversionPayload(item)
    const entry = await journalApi.create(payload)
    await store().markConverted(item.id, "journal", entry.id)
    return { id: entry.id }
  },
}
