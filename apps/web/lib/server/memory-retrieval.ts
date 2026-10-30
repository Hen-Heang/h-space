// Second Brain, Phase 5: Ask Hengo — server-side retrieval only. Every query
// here runs against the per-request Supabase client from requireUser()
// (carries the caller's JWT), never a service key — RLS scopes every result
// to the signed-in user by construction, so this file never adds its own
// `.eq("user_id", ...)` filters (matching the rest of the app's convention:
// "queries rely on RLS rather than filtering by user id everywhere").
//
// Retrieval is Postgres full-text search (the generated `search` tsvector
// columns already on kori_notes / kori_inbox_items / kori_journal_entries)
// plus a handful of bounded structured reads — no embeddings/vector search,
// per the mission's "only if it fits cleanly" (FTS is the stated starting
// point and is sufficient at this app's per-user data volume).
import type { SupabaseClient } from "@supabase/supabase-js"
import { sanitizeSearchQuery } from "@/lib/memory"

export type RetrievedSourceType =
  "note" | "inbox_item" | "journal" | "memory" | "goal" | "correction" | "task" | "manual_activity"

export interface RetrievedItem {
  type: RetrievedSourceType
  id: string | null
  title: string
  snippet: string
  href: string | null
}

const SNIPPET_LEN = 220
const FTS_LIMIT = 5

function snippet(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim().replace(/\s+/g, " ")
  return trimmed.length > SNIPPET_LEN ? `${trimmed.slice(0, SNIPPET_LEN)}…` : trimmed
}

const emptyResult = Promise.resolve({ data: [] as Record<string, unknown>[], error: null })

/**
 * Runs every retrieval query in parallel and flattens the results into one
 * bounded, labeled list. Each item keeps its source type/id/href so the AI's
 * answer can cite exactly where a claim came from and the user can open the
 * original record to verify it.
 */
export interface RetrievalSources {
  /**
   * Full-text search over inbox items held outside Supabase (hspace-api, once
   * the inbox has moved — see lib/server/hspace-inbox.ts). Same websearch /
   * English semantics; must already be scoped to the caller.
   */
  searchInbox?: (query: string, limit: number) => Promise<InboxSearchRow[]>
}

export interface InboxSearchRow {
  id: string
  title: string | null
  content: string
  item_type: string
}

export async function retrieveMemoryContext(
  db: SupabaseClient,
  question: string,
  sources: RetrievalSources = {},
): Promise<RetrievedItem[]> {
  const searchQuery = sanitizeSearchQuery(question)
  const ftsOptions = { type: "websearch" as const, config: "english" }
  const { searchInbox } = sources

  const [
    notesRes,
    inboxRes,
    journalFtsRes,
    journalRecentRes,
    memoriesRes,
    goalsRes,
    correctionsRes,
    tasksRes,
    activitiesRes,
  ] = await Promise.all([
    searchQuery
      ? db
          .from("kori_notes")
          .select("id, slug, title, description, content")
          .textSearch("search", searchQuery, ftsOptions)
          .limit(FTS_LIMIT)
      : emptyResult,
    !searchQuery
      ? emptyResult
      : searchInbox
        ? searchInbox(searchQuery, FTS_LIMIT).then((data) => ({ data, error: null }))
        : db
            .from("kori_inbox_items")
            .select("id, title, content, item_type")
            .textSearch("search", searchQuery, ftsOptions)
            .limit(FTS_LIMIT),
    searchQuery
      ? db
          .from("kori_journal_entries")
          .select("id, occurred_at, title, content, achievement, lesson, blocker")
          .textSearch("search", searchQuery, ftsOptions)
          .order("occurred_at", { ascending: false })
          .limit(FTS_LIMIT)
      : emptyResult,
    db
      .from("kori_journal_entries")
      .select("id, occurred_at, title, content, achievement, lesson, blocker")
      .order("occurred_at", { ascending: false })
      .limit(5),
    db
      .from("kori_memory_candidates")
      .select("id, fact, category")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("goals")
      .select("id, title, status, health_status, health_reason, outcome_statement")
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("kori_corrections")
      .select(
        "id, original_text, corrected_text, explanation, error_category, occurrence_count, last_seen_at",
      )
      .order("occurrence_count", { ascending: false })
      .limit(8),
    db
      .from("tasks")
      .select("id, title, description, completed, end_date, goal_id")
      .eq("completed", true)
      .order("end_date", { ascending: false })
      .limit(8),
    db
      .from("kori_manual_activities")
      .select("id, occurred_at, label, category, notes")
      .order("occurred_at", { ascending: false })
      .limit(8),
  ])

  const items: RetrievedItem[] = []
  const seenJournalIds = new Set<string>()

  for (const row of (notesRes.data ?? []) as {
    id: string
    slug: string
    title: string
    description: string
    content: string
  }[]) {
    items.push({
      type: "note",
      id: row.id,
      title: row.title,
      snippet: snippet(row.description || row.content),
      href: `/notes/${row.slug}`,
    })
  }

  for (const row of (inboxRes.data ?? []) as InboxSearchRow[]) {
    items.push({
      type: "inbox_item",
      id: row.id,
      title: row.title?.trim() || row.content.slice(0, 60),
      snippet: snippet(row.content),
      href: "/inbox",
    })
  }

  function pushJournalRow(row: {
    id: string
    occurred_at: string
    title: string | null
    content: string
    achievement: string | null
    lesson: string | null
    blocker: string | null
  }) {
    if (seenJournalIds.has(row.id)) return
    seenJournalIds.add(row.id)
    const body = [row.content, row.achievement, row.lesson, row.blocker].filter(Boolean).join(" — ")
    items.push({
      type: "journal",
      id: row.id,
      title: row.title?.trim() || `Journal entry — ${row.occurred_at.slice(0, 10)}`,
      snippet: snippet(body),
      href: "/growth/journal",
    })
  }
  for (const row of (journalFtsRes.data ?? []) as Parameters<typeof pushJournalRow>[0][])
    pushJournalRow(row)
  for (const row of (journalRecentRes.data ?? []) as Parameters<typeof pushJournalRow>[0][])
    pushJournalRow(row)

  for (const row of (memoriesRes.data ?? []) as { id: string; fact: string; category: string }[]) {
    items.push({
      type: "memory",
      id: row.id,
      title: `Known (${row.category})`,
      snippet: row.fact,
      href: "/ask-hengo/memories",
    })
  }

  for (const row of (goalsRes.data ?? []) as {
    id: string
    title: string
    status: string
    health_status: string | null
    health_reason: string | null
    outcome_statement: string | null
  }[]) {
    const bits = [`status: ${row.status}`]
    if (row.health_status)
      bits.push(`health: ${row.health_status}${row.health_reason ? ` (${row.health_reason})` : ""}`)
    if (row.outcome_statement) bits.push(row.outcome_statement)
    items.push({
      type: "goal",
      id: row.id,
      title: row.title,
      snippet: snippet(bits.join(" — ")),
      href: `/goals/${row.id}`,
    })
  }

  for (const row of (correctionsRes.data ?? []) as {
    id: string
    original_text: string
    corrected_text: string
    explanation: string | null
    error_category: string | null
    occurrence_count: number
    last_seen_at: string | null
  }[]) {
    const repeated = row.occurrence_count > 1 ? ` (repeated ${row.occurrence_count}x)` : ""
    items.push({
      type: "correction",
      id: row.id,
      title: `Mistake${row.error_category ? ` — ${row.error_category}` : ""}${repeated}`,
      snippet: snippet(
        `"${row.original_text}" → "${row.corrected_text}"${row.explanation ? ` (${row.explanation})` : ""}`,
      ),
      href: "/korean-coach/mistakes",
    })
  }

  for (const row of (tasksRes.data ?? []) as {
    id: string
    title: string | null
    description: string
    completed: boolean
    end_date: string
    goal_id: string | null
  }[]) {
    items.push({
      type: "task",
      id: row.id,
      title: row.title?.trim() || row.description.slice(0, 60) || "Task",
      snippet: snippet(`Completed ${row.end_date.slice(0, 10)}`),
      href: row.goal_id ? `/goals/${row.goal_id}/tasks` : "/goals/tasks",
    })
  }

  for (const row of (activitiesRes.data ?? []) as {
    id: string
    occurred_at: string
    label: string
    category: string | null
    notes: string | null
  }[]) {
    items.push({
      type: "manual_activity",
      id: row.id,
      title: row.label,
      snippet: snippet(
        `${row.occurred_at.slice(0, 10)}${row.category ? ` (${row.category})` : ""}${row.notes ? ` — ${row.notes}` : ""}`,
      ),
      href: "/timeline",
    })
  }

  return items
}

/** Renders retrieved items as a single `<user_data>`-labeled block so the
 * prompt can never confuse "things the user wrote" with "instructions for
 * the model" — the system prompt explicitly tells the model to treat
 * everything inside as inert data, never as commands to follow. */
export function formatRetrievedContext(items: RetrievedItem[]): string {
  if (items.length === 0)
    return "<user_data>\n(No matching personal data was found for this question.)\n</user_data>"
  const lines = items.map(
    (item, i) =>
      `[${i}] (${item.type}${item.id ? `, id=${item.id}` : ""}) ${item.title}: ${item.snippet}`,
  )
  return `<user_data>\n${lines.join("\n")}\n</user_data>`
}
