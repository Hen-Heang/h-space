import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import type { Note, NoteInput, NoteMeta, NoteType } from "@/lib/notes"

import { isMissingSchemaError } from "./schema-errors"

// Study notes (markdown) over kori_notes, keyed by (user, slug). Domain types
// live in lib/notes.ts (matching the lib/tasks.ts + lib/api/goals.ts split);
// re-exported here so existing `import { NoteMeta } from "@/lib/api"` call
// sites keep working unchanged.
export type { Note, NoteInput, NoteMeta } from "@/lib/notes"

type NoteRow = {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string | null
  note_type: NoteType
  tags: string[]
  pinned: boolean
  source_url: string | null
  goal_id: string | null
  task_id: string | null
  inbox_item_id: string | null
  /** Absent until migration 20261102120000_note_projects is applied. */
  project_id?: string | null
  content: string
  created_at: string
  updated_at: string
}

const LEGACY_META_COLUMNS =
  "id, slug, title, description, icon, category, note_type, tags, pinned, source_url, goal_id, task_id, inbox_item_id, created_at, updated_at"
const META_COLUMNS = `${LEGACY_META_COLUMNS}, project_id`

/**
 * Whether kori_notes has `project_id`. Starts optimistic; flips to false the
 * first time Postgres reports the column missing, so the Notes list keeps
 * working if the app deploys before the projects migration is applied.
 */
let projectColumnAvailable = true

/** Test hook — resets the cached column check. */
export function resetNotesSchemaCache() {
  projectColumnAvailable = true
}

async function selectMeta(
  run: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<NoteRow[]> {
  if (projectColumnAvailable) {
    const { data, error } = await run(META_COLUMNS)
    if (!error) return (data ?? []) as NoteRow[]
    if (!isMissingSchemaError(error)) throw error
    projectColumnAvailable = false
  }
  const { data, error } = await run(LEGACY_META_COLUMNS)
  if (error) throw error
  return (data ?? []) as NoteRow[]
}

function toMeta(row: NoteRow): NoteMeta {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category ?? undefined,
    noteType: row.note_type,
    tags: row.tags ?? [],
    pinned: row.pinned,
    sourceUrl: row.source_url,
    goalId: row.goal_id,
    taskId: row.task_id,
    inboxItemId: row.inbox_item_id,
    projectId: row.project_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toNote(row: NoteRow): Note {
  return { ...toMeta(row), content: row.content }
}

export const notesApi = {
  list: async (): Promise<NoteMeta[]> => {
    const rows = await selectMeta((columns) =>
      supabase.from("kori_notes").select(columns).order("updated_at", { ascending: false }),
    )
    return rows.map(toMeta)
  },

  get: async (slug: string): Promise<Note> => {
    const { data, error } = await supabase.from("kori_notes").select("*").eq("slug", slug).single()
    if (error) throw error
    return toNote(data as NoteRow)
  },

  /**
   * Server-side full-text search over title/description/content (the
   * generated `search` tsvector column) — bounded to 50 rows so a broad query
   * never pulls the whole library to the client. Used instead of the
   * metadata-only client filter whenever the user has typed a query.
   */
  search: async (query: string): Promise<NoteMeta[]> => {
    const trimmed = query.trim()
    if (!trimmed) return []
    const rows = await selectMeta((columns) =>
      supabase
        .from("kori_notes")
        .select(columns)
        .textSearch("search", trimmed, { type: "websearch", config: "english" })
        .order("updated_at", { ascending: false })
        .limit(50),
    )
    return rows.map(toMeta)
  },

  create: async (data: NoteInput): Promise<Note> => {
    const userId = requireUserId()
    const { data: row, error } = await supabase
      .from("kori_notes")
      .insert({
        user_id: userId,
        slug: data.slug,
        title: data.title,
        description: data.description ?? "",
        category: data.category ?? null,
        note_type: data.noteType ?? "technical",
        content: data.content,
        icon: data.icon ?? "FileText",
        tags: data.tags ?? [],
        pinned: data.pinned ?? false,
        source_url: data.sourceUrl ?? null,
        goal_id: data.goalId ?? null,
        task_id: data.taskId ?? null,
        inbox_item_id: data.inboxItemId ?? null,
        // Only sent when a project was chosen, so creating a plain note never
        // depends on the projects migration.
        ...(data.projectId ? { project_id: data.projectId } : {}),
      })
      .select()
      .single()
    if (error) throw error
    return toNote(row as NoteRow)
  },

  update: async (slug: string, data: Partial<NoteInput>): Promise<Note> => {
    const { data: row, error } = await supabase
      .from("kori_notes")
      .update({
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.noteType !== undefined ? { note_type: data.noteType } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.sourceUrl !== undefined ? { source_url: data.sourceUrl } : {}),
        ...(data.goalId !== undefined ? { goal_id: data.goalId } : {}),
        ...(data.taskId !== undefined ? { task_id: data.taskId } : {}),
        ...(data.inboxItemId !== undefined ? { inbox_item_id: data.inboxItemId } : {}),
        ...(data.projectId !== undefined ? { project_id: data.projectId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug)
      .select()
      .single()
    if (error) throw error
    return toNote(row as NoteRow)
  },

  togglePinned: async (slug: string, pinned: boolean): Promise<Note> =>
    notesApi.update(slug, { pinned }),

  remove: async (slug: string) => {
    const { error } = await supabase.from("kori_notes").delete().eq("slug", slug)
    if (error) throw error
  },
}
