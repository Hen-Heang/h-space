// Quick Capture Inbox — pure domain logic (validation, tag parsing, filtering,
// conversion payload building). Framework-free so it's covered by colocated
// Vitest tests; Supabase access lives in lib/api/inbox.ts.

import { dedupeSlug, slugify } from "./slug"
import { parseTagsInput as sharedParseTagsInput } from "./tags"
import type { NoteType } from "./notes"

export type InboxItemType = "idea" | "note" | "task" | "activity" | "phrase" | "dev" | "journal"
export type InboxItemStatus = "inbox" | "processed" | "archived"
export type InboxItemSource = "manual" | "voice" | "ai" | "converted"
export type InboxConversionTarget = "note" | "task" | "journal"

export interface InboxItem {
  id: string
  title: string | null
  content: string
  itemType: InboxItemType
  tags: string[]
  capturedAt: string
  eventAt: string | null
  goalId: string | null
  status: InboxItemStatus
  source: InboxItemSource
  pinned: boolean
  convertedToType: InboxConversionTarget | null
  convertedToId: string | null
  createdAt: string
  updatedAt: string
}

export interface InboxItemInput {
  title?: string | null
  content: string
  itemType: InboxItemType
  tags?: string[]
  eventAt?: string | null
  goalId?: string | null
  source?: InboxItemSource
}

export const INBOX_ITEM_TYPES: { value: InboxItemType; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
  { value: "activity", label: "Activity" },
  { value: "phrase", label: "Korean phrase" },
  { value: "dev", label: "Dev learning" },
  { value: "journal", label: "Journal thought" },
]

export const MAX_TITLE_LENGTH = 200
export const MAX_CONTENT_LENGTH = 4000

// ── Validation ───────────────────────────────────────────────────────────────

export interface InboxValidationErrors {
  title?: string
  content?: string
}

/** Pure validation used by both the capture form and any programmatic caller. */
export function validateInboxItemInput(input: {
  title?: string | null
  content: string
}): InboxValidationErrors {
  const errors: InboxValidationErrors = {}
  const content = input.content.trim()
  if (!content) errors.content = "Write or dictate something to capture."
  else if (content.length > MAX_CONTENT_LENGTH)
    errors.content = `Keep it under ${MAX_CONTENT_LENGTH} characters.`

  const title = input.title?.trim()
  if (title && title.length > MAX_TITLE_LENGTH)
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`

  return errors
}

export function isInboxItemInputValid(input: { title?: string | null; content: string }): boolean {
  const errors = validateInboxItemInput(input)
  return Object.keys(errors).length === 0
}

// ── Tags ─────────────────────────────────────────────────────────────────────

/** Parses a free-typed "tag1, tag2, tag2" string into trimmed, deduped, lowercase tags. */
export const parseTagsInput = sharedParseTagsInput

// ── Filtering / search ───────────────────────────────────────────────────────

export interface InboxFilters {
  type?: InboxItemType | "all"
  status?: InboxItemStatus | "all"
  tag?: string | "all"
  query?: string
}

function matchesQuery(item: InboxItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  const haystack = `${item.title ?? ""} ${item.content}`.toLowerCase()
  return haystack.includes(normalizedQuery)
}

/**
 * Client-side filter over an already-fetched page of items — used to combine
 * type/status/tag/search without a network round-trip per keystroke. The API
 * layer still does the bounded server fetch (status/type) so this never runs
 * over the user's entire history.
 */
export function filterInboxItems(items: InboxItem[], filters: InboxFilters): InboxItem[] {
  const normalizedQuery = filters.query?.trim().toLowerCase() ?? ""
  return items.filter((item) => {
    if (filters.type && filters.type !== "all" && item.itemType !== filters.type) return false
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false
    if (filters.tag && filters.tag !== "all" && !item.tags.includes(filters.tag)) return false
    return matchesQuery(item, normalizedQuery)
  })
}

/** Pinned first, then most recently captured. Pure so both the hook and UI agree on order. */
export function sortInboxItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  })
}

/** Every distinct tag across a set of items, alphabetical — powers the tag filter dropdown. */
export function collectInboxTags(items: InboxItem[]): string[] {
  const tags = new Set<string>()
  for (const item of items) for (const tag of item.tags) tags.add(tag)
  return [...tags].sort()
}

/**
 * The tag filter that actually applies: the chosen tag while some loaded item
 * still carries it, otherwise "all" — so switching status/type can't leave a
 * stale tag silently emptying the list.
 */
export function resolveInboxTag(tag: string | undefined, availableTags: string[]): string {
  return tag && tag !== "all" && availableTags.includes(tag) ? tag : "all"
}

/**
 * What the Inbox page lists. Status and type are applied by the query; this
 * narrows the fetched items by search text and tag, pinned first.
 */
export function visibleInboxItems(items: InboxItem[], filters: InboxFilters): InboxItem[] {
  const tag = resolveInboxTag(filters.tag, collectInboxTags(items))
  return sortInboxItems(filterInboxItems(items, { query: filters.query, tag }))
}

// ── Conversion ───────────────────────────────────────────────────────────────

const TYPE_TO_NOTE_TYPE: Record<InboxItemType, NoteType> = {
  idea: "idea",
  note: "technical",
  task: "technical",
  activity: "personal",
  phrase: "korean",
  dev: "technical",
  journal: "personal",
}

/** Deterministic, collision-tolerant slug — the caller appends a suffix on conflict. */
export function slugifyInboxTitle(source: string): string {
  return slugify(source) || "note"
}

export interface NoteConversionPayload {
  slug: string
  title: string
  description: string
  noteType: NoteType
  content: string
  tags: string[]
}

/** Builds the note payload for an inbox → note conversion. Pure — no Supabase calls. */
export function buildNoteConversionPayload(
  item: InboxItem,
  existingSlugs: string[] = [],
): NoteConversionPayload {
  const title = item.title?.trim() || item.content.slice(0, 60).trim() || "Untitled note"
  const slug = dedupeSlug(slugifyInboxTitle(title), existingSlugs)
  return {
    slug,
    title,
    description: item.content.slice(0, 140),
    noteType: TYPE_TO_NOTE_TYPE[item.itemType],
    content: item.content,
    tags: item.tags,
  }
}

export interface TaskConversionPayload {
  title: string
  description: string
  start_date: string
  end_date: string
  is_anytime: true
  tags: string[]
  goal_id: string | null
  source: "manual"
}

/** Builds the task payload for an inbox → task conversion. `date` is an ISO date (YYYY-MM-DD). */
export function buildTaskConversionPayload(item: InboxItem, date: string): TaskConversionPayload {
  return {
    title: item.title?.trim() || item.content.slice(0, 80),
    description: item.content,
    start_date: date,
    end_date: date,
    is_anytime: true,
    tags: item.tags,
    goal_id: item.goalId,
    source: "manual",
  }
}

export interface JournalConversionPayload {
  occurredAt: string
  title: string | null
  content: string
  tags: string[]
}

/** Builds the journal payload for an inbox → journal conversion. Pure — no Supabase calls. */
export function buildJournalConversionPayload(item: InboxItem): JournalConversionPayload {
  return {
    occurredAt: item.eventAt ?? item.capturedAt,
    title: item.title,
    content: item.content,
    tags: item.tags,
  }
}
