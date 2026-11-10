// Notes Home — pure selection logic for /notes (search scope, grouping, side
// column lists, Quick Capture). Framework-free and tested in
// lib/notes-home.test.ts; the page only renders what these return.
//
// Projects come from kori_note_projects (lib/note-projects.ts). Notes without
// a project — every note written before projects existed — sit in a
// "No project" bucket, so they still appear everywhere.

import type { InboxItemInput } from "@/lib/inbox"
import { projectStatusLabel, type Project, type ProjectStatus } from "@/lib/note-projects"
import { NOTE_TYPES, type NoteMeta, type NoteType } from "@/lib/notes"

// ── Project grouping ─────────────────────────────────────────────────────────

/** Id of the bucket that holds notes with no project. */
export const NO_PROJECT_ID = "none"

export interface NoteProject {
  id: string
  name: string
  description: string
  tags: string[]
  noteCount: number
  /** Newest of the project's own update and its notes' updates. */
  updatedAt?: string
  /** True for the "No project" bucket — not a real, editable project. */
  isInbox: boolean
  /** The underlying project row (absent for the "No project" bucket). */
  project?: Project
}

function newest(values: (string | null | undefined)[]): string | undefined {
  let latest: string | undefined
  for (const value of values) {
    if (!value) continue
    if (!latest || new Date(value).getTime() > new Date(latest).getTime()) latest = value
  }
  return latest
}

/** The project a note belongs to, or NO_PROJECT_ID when it has none we know of. */
export function projectIdOf(note: NoteMeta, knownProjectIds?: Set<string>): string {
  const id = note.projectId
  if (!id) return NO_PROJECT_ID
  if (knownProjectIds && !knownProjectIds.has(id)) return NO_PROJECT_ID
  return id
}

/**
 * Real projects (in the order given) with their note counts, followed by a
 * "No project" bucket when any note has no (known) project.
 */
export function groupNotesIntoProjects(notes: NoteMeta[], projects: Project[] = []): NoteProject[] {
  const known = new Set(projects.map((p) => p.id))
  const byProject = new Map<string, NoteMeta[]>()
  for (const note of notes) {
    const id = projectIdOf(note, known)
    const list = byProject.get(id)
    if (list) list.push(note)
    else byProject.set(id, [note])
  }

  const grouped: NoteProject[] = projects.map((project) => {
    const projectNotes = byProject.get(project.id) ?? []
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      tags: project.tags,
      noteCount: projectNotes.length,
      updatedAt: newest([project.updatedAt, ...projectNotes.map((n) => n.updatedAt)]),
      isInbox: false,
      project,
    }
  })

  const loose = byProject.get(NO_PROJECT_ID) ?? []
  if (loose.length > 0) {
    grouped.push({
      id: NO_PROJECT_ID,
      name: "No project",
      description: "Notes that aren't in a project yet.",
      tags: [],
      noteCount: loose.length,
      updatedAt: newest(loose.map((n) => n.updatedAt)),
      isInbox: true,
    })
  }
  return grouped
}

// ── Search ───────────────────────────────────────────────────────────────────

/** `"all"` or a project id from `groupNotesIntoProjects`. */
export type NoteSearchScope = string

export interface NoteSearchResults {
  projectHits: NoteProject[]
  noteHits: NoteMeta[]
  total: number
  /** "all notes" or the scoped project's name — always shown next to the count. */
  scopeLabel: string
  /** e.g. "3 results in all notes". */
  summary: string
}

function includesQuery(values: (string | null | undefined)[], normalizedQuery: string): boolean {
  return values.some((value) => (value ?? "").toLowerCase().includes(normalizedQuery))
}

/**
 * Builds the grouped result list for a typed query.
 *
 * `noteMatches` are the notes that already match the query — the page passes
 * the server-side full-text results here (title/description/content), so this
 * function only applies the scope and type filter. Project hits match on
 * name/description/tags, are hidden when a project scope is set, and never include
 * the "No project" bucket (it isn't something you search for by name).
 */
export function buildNoteSearchResults({
  query,
  scope,
  projects,
  noteMatches,
  noteType = "all",
  pinnedOnly = false,
  projectStatus = "all",
}: {
  query: string
  scope: NoteSearchScope
  projects: NoteProject[]
  noteMatches: NoteMeta[]
  noteType?: NoteType | "all"
  /** Keep only pinned notes (the same filter the note list uses). */
  pinnedOnly?: boolean
  /** Keep only project hits with this status (the Projects list's filter). */
  projectStatus?: ProjectStatus | "all"
}): NoteSearchResults {
  const normalizedQuery = query.trim().toLowerCase()
  const scopedProject = scope === "all" ? undefined : projects.find((p) => p.id === scope)
  const scopeLabel = scopedProject ? scopedProject.name : "all notes"

  const projectHits =
    normalizedQuery && !scopedProject
      ? projects.filter(
          (p) =>
            !p.isInbox &&
            (projectStatus === "all" || p.project?.status === projectStatus) &&
            includesQuery([p.name, p.description, ...p.tags], normalizedQuery),
        )
      : []

  const known = new Set(projects.filter((p) => !p.isInbox).map((p) => p.id))
  const noteHits = normalizedQuery
    ? noteMatches.filter(
        (note) =>
          (!scopedProject || projectIdOf(note, known) === scopedProject.id) &&
          (noteType === "all" || note.noteType === noteType) &&
          (!pinnedOnly || note.pinned),
      )
    : []

  const total = projectHits.length + noteHits.length
  return {
    projectHits,
    noteHits,
    total,
    scopeLabel,
    summary: `${total} ${total === 1 ? "result" : "results"} in ${scopeLabel}`,
  }
}

// ── Filters ──────────────────────────────────────────────────────────────────

/** Every filter on Notes Home. One state for both the Notes and Projects views. */
export interface NotesHomeFilters {
  /** "all", a project id, or NO_PROJECT_ID — applies to the note list and search. */
  scope: NoteSearchScope
  noteType: NoteType | "all"
  pinnedOnly: boolean
  /** Applies to the project list and project search hits. */
  projectStatus: ProjectStatus | "all"
}

export const DEFAULT_NOTES_HOME_FILTERS: NotesHomeFilters = {
  scope: "all",
  noteType: "all",
  pinnedOnly: false,
  projectStatus: "all",
}

/** The note list's filters: scope (a project or "No project"), type and pinned. */
export function filterHomeNotes(
  notes: NoteMeta[],
  filters: Pick<NotesHomeFilters, "scope" | "noteType" | "pinnedOnly">,
  knownProjectIds: Set<string>,
): NoteMeta[] {
  return notes.filter(
    (note) =>
      (filters.scope === "all" || projectIdOf(note, knownProjectIds) === filters.scope) &&
      (filters.noteType === "all" || note.noteType === filters.noteType) &&
      (!filters.pinnedOnly || note.pinned),
  )
}

/**
 * Active filters written out for the line under search ("In: Sample API ·
 * Decision · Pinned only"). `kinds` limits it to the filters the current view
 * uses. A scope whose project no longer exists isn't listed (it's ignored).
 */
export function describeActiveFilters(
  filters: NotesHomeFilters,
  projects: NoteProject[],
  kinds: { notes: boolean; projects: boolean } = { notes: true, projects: true },
): string[] {
  const labels: string[] = []
  if (kinds.notes) {
    const scoped =
      filters.scope === "all" ? undefined : projects.find((p) => p.id === filters.scope)
    if (scoped) labels.push(scoped.isInbox ? "No project" : `In: ${scoped.name}`)
    if (filters.noteType !== "all") {
      labels.push(NOTE_TYPES.find((t) => t.value === filters.noteType)?.label ?? filters.noteType)
    }
    if (filters.pinnedOnly) labels.push("Pinned only")
  }
  if (kinds.projects && filters.projectStatus !== "all") {
    labels.push(`Status: ${projectStatusLabel(filters.projectStatus)}`)
  }
  return labels
}

// ── Default view lists ───────────────────────────────────────────────────────

function byUpdatedDesc(a: NoteMeta, b: NoteMeta): number {
  return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
}

/** Pinned notes, most recently updated first. */
export function selectPinnedNotes(notes: NoteMeta[], limit = 5): NoteMeta[] {
  return notes
    .filter((note) => note.pinned)
    .sort(byUpdatedDesc)
    .slice(0, limit)
}

/** The most recently updated notes (pinned or not). */
export function selectRecentNotes(notes: NoteMeta[], limit = 5): NoteMeta[] {
  return [...notes].sort(byUpdatedDesc).slice(0, limit)
}

export function countNotesByType(notes: NoteMeta[], noteType: NoteType): number {
  return notes.filter((note) => note.noteType === noteType).length
}

// ── Quick Capture ────────────────────────────────────────────────────────────

export const CAPTURE_TITLE_LENGTH = 60

/**
 * Turns Quick Capture text into an Inbox item (type "note"): the title is the
 * first line, cut to 60 characters. Returns null for blank text so the caller
 * can show a hint instead of saving an empty item.
 */
export function buildCaptureInput(text: string): InboxItemInput | null {
  const content = text.trim()
  if (!content) return null
  const firstLine = content.split(/\r?\n/, 1)[0].trim()
  const title =
    firstLine.length > CAPTURE_TITLE_LENGTH
      ? `${firstLine.slice(0, CAPTURE_TITLE_LENGTH - 1).trimEnd()}…`
      : firstLine
  return { title, content, itemType: "note", source: "manual" }
}
