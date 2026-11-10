// Notes (Knowledge Library) — pure domain types + logic. Framework-free so
// it's covered by colocated Vitest tests; Supabase access lives in
// lib/api/notes.ts (which imports the types from here, matching the
// lib/tasks.ts + lib/api/goals.ts convention).

import { slugify } from "./slug"

export type NoteType = "technical" | "korean" | "personal" | "decision" | "idea" | "reference"

export const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "korean", label: "Korean" },
  { value: "personal", label: "Personal" },
  { value: "decision", label: "Decision" },
  { value: "idea", label: "Idea" },
  { value: "reference", label: "Reference" },
]

export interface NoteMeta {
  id?: string
  slug: string
  title: string
  description: string
  icon: string
  category?: string
  noteType: NoteType
  tags?: string[]
  pinned: boolean
  sourceUrl?: string | null
  goalId?: string | null
  taskId?: string | null
  inboxItemId?: string | null
  /** kori_note_projects id; null/undefined means "No project". */
  projectId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Note extends NoteMeta {
  content: string
}

export interface NoteInput {
  slug: string
  title: string
  description?: string
  category?: string
  noteType?: NoteType
  content: string
  icon?: string
  tags?: string[]
  pinned?: boolean
  sourceUrl?: string | null
  goalId?: string | null
  taskId?: string | null
  inboxItemId?: string | null
  projectId?: string | null
}

export const MAX_NOTE_TITLE_LENGTH = 200
export const MAX_NOTE_CONTENT_LENGTH = 50_000

/**
 * Slugs that collide with static routes under /notes (`/notes/new`,
 * `/notes/projects/[id]`) — a note with one of these would be unreachable.
 */
export const RESERVED_NOTE_SLUGS = ["new", "projects"] as const

export function isReservedNoteSlug(slug: string): boolean {
  return (RESERVED_NOTE_SLUGS as readonly string[]).includes(slug.trim().toLowerCase())
}

/**
 * A slug for a note whose title has no ASCII letters or digits (a Korean or
 * Khmer title slugifies to ""): `note-YYYYMMDD-xxxx`, from the local date and
 * four random base-36 characters. Slugs stay ASCII so URLs, the MCP tools and
 * the reserved-slug check keep working unchanged.
 */
export function generatedNoteSlug(now: Date = new Date(), random: () => number = Math.random) {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("")
  let suffix = ""
  for (let i = 0; i < 4; i += 1) suffix += Math.floor(random() * 36).toString(36)
  return `note-${date}-${suffix}`
}

/** The slug the editor suggests for a title, or `fallback` when it has none. */
export function noteSlugFromTitle(title: string, fallback: string): string {
  return slugify(title) || fallback
}

export interface NoteValidationErrors {
  title?: string
  content?: string
  sourceUrl?: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/** Pure validation shared by the create and edit forms. */
export function validateNoteInput(input: {
  title: string
  content: string
  sourceUrl?: string | null
}): NoteValidationErrors {
  const errors: NoteValidationErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = "Title is required."
  else if (title.length > MAX_NOTE_TITLE_LENGTH)
    errors.title = `Keep the title under ${MAX_NOTE_TITLE_LENGTH} characters.`

  const content = input.content.trim()
  if (!content) errors.content = "Content is required."
  else if (content.length > MAX_NOTE_CONTENT_LENGTH)
    errors.content = `Keep it under ${MAX_NOTE_CONTENT_LENGTH} characters.`

  const sourceUrl = input.sourceUrl?.trim()
  if (sourceUrl && !isValidHttpUrl(sourceUrl))
    errors.sourceUrl = "Enter a full URL (starting with http:// or https://)."

  return errors
}

export function isNoteInputValid(input: {
  title: string
  content: string
  sourceUrl?: string | null
}): boolean {
  return Object.keys(validateNoteInput(input)).length === 0
}

// ── Filtering / sorting ──────────────────────────────────────────────────────

export interface NoteFilters {
  noteType?: NoteType | "all"
  pinnedOnly?: boolean
  /** Metadata-only quick filter (title/description/category/tags) — full-text
   * content search goes through lib/api/notes.ts's server-side `search()`. */
  query?: string
}

function matchesMetaQuery(note: NoteMeta, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  return (
    note.title.toLowerCase().includes(normalizedQuery) ||
    note.description.toLowerCase().includes(normalizedQuery) ||
    (note.category ?? "").toLowerCase().includes(normalizedQuery) ||
    (note.tags ?? []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
  )
}

/** Client-side filter over an already-fetched metadata list — no note content involved. */
export function filterNotesMeta(notes: NoteMeta[], filters: NoteFilters): NoteMeta[] {
  const normalizedQuery = filters.query?.trim().toLowerCase() ?? ""
  return notes.filter((note) => {
    if (filters.noteType && filters.noteType !== "all" && note.noteType !== filters.noteType)
      return false
    if (filters.pinnedOnly && !note.pinned) return false
    return matchesMetaQuery(note, normalizedQuery)
  })
}

/** Pinned first, then most recently updated. */
export function sortNotesMeta(notes: NoteMeta[]): NoteMeta[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
  })
}

// Reading speeds behind readingMinutes: ~220 words a minute for space-separated
// text, ~500 characters a minute for Hangul, CJK and Khmer (written without
// spaces between words, so counting "words" would undercount them).
const WORDS_PER_MINUTE = 220
const CHARS_PER_MINUTE = 500
const UNSPACED_SCRIPTS =
  /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Khmer}]/gu

/** Estimated reading time in whole minutes (at least 1) for a note's markdown. */
export function readingMinutes(markdown: string): number {
  // Markdown punctuation isn't read; code is, so it counts like prose.
  const text = markdown.replace(/[#>*_`~[\]()|-]/g, " ")
  const unspaced = text.match(UNSPACED_SCRIPTS)?.length ?? 0
  const words = text.replace(UNSPACED_SCRIPTS, " ").split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE + unspaced / CHARS_PER_MINUTE))
}
