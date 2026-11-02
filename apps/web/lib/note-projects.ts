// Note projects — pure domain types + logic for grouping notes into projects
// (Notes 2.0). Supabase I/O lives in lib/api/note-projects.ts; tests in
// lib/note-projects.test.ts. Table: kori_note_projects (migration
// 20261102120000_note_projects.sql).

import type { NoteMeta } from "@/lib/notes"

export type ProjectType = "personal" | "learning" | "open_source" | "work_reference"
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "archived"

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "learning", label: "Learning" },
  { value: "open_source", label: "Open Source" },
  { value: "work_reference", label: "Work Reference" },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

export interface Project {
  id: string
  name: string
  description: string
  projectType: ProjectType
  status: ProjectStatus
  tags: string[]
  repoUrl: string | null
  startDate: string | null
  targetDate: string | null
  lastOpenedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectInput {
  name: string
  description?: string
  projectType?: ProjectType
  status?: ProjectStatus
  tags?: string[]
  repoUrl?: string | null
  startDate?: string | null
  targetDate?: string | null
}

export const MAX_PROJECT_NAME_LENGTH = 120
export const MAX_PROJECT_DESCRIPTION_LENGTH = 500
export const MAX_PROJECT_TAGS = 20

export function projectTypeLabel(value: ProjectType): string {
  return PROJECT_TYPES.find((t) => t.value === value)?.label ?? "Personal"
}

export function projectStatusLabel(value: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === value)?.label ?? "Active"
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface ProjectValidationErrors {
  name?: string
  description?: string
  repoUrl?: string
  targetDate?: string
  tags?: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/** Mirrors the table's check constraints so the form can explain them first. */
export function validateProjectInput(input: ProjectInput): ProjectValidationErrors {
  const errors: ProjectValidationErrors = {}
  const name = input.name.trim()
  if (!name) errors.name = "Give the project a name to continue."
  else if (name.length > MAX_PROJECT_NAME_LENGTH)
    errors.name = `Keep the name under ${MAX_PROJECT_NAME_LENGTH} characters.`

  if ((input.description ?? "").trim().length > MAX_PROJECT_DESCRIPTION_LENGTH)
    errors.description = `Keep the description under ${MAX_PROJECT_DESCRIPTION_LENGTH} characters.`

  const repoUrl = input.repoUrl?.trim()
  if (repoUrl && !isValidHttpUrl(repoUrl))
    errors.repoUrl = "Enter a full link (starting with http:// or https://)."

  if (input.startDate && input.targetDate && input.targetDate < input.startDate)
    errors.targetDate = "The target date can't be before the start date."

  if ((input.tags ?? []).length > MAX_PROJECT_TAGS)
    errors.tags = `Use at most ${MAX_PROJECT_TAGS} tags.`

  return errors
}

/** "Spring Boot, PostgreSQL ,, jwt" → ["Spring Boot", "PostgreSQL", "jwt"], de-duplicated. */
export function parseTagList(text: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of text.split(",")) {
    const tag = raw.trim().replace(/\s+/g, " ")
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return tags
}

/** Trims text fields and turns blanks into nulls before saving. */
export function normalizeProjectInput(input: ProjectInput): ProjectInput {
  const blankToNull = (v?: string | null) => (v && v.trim() ? v.trim() : null)
  return {
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    projectType: input.projectType ?? "personal",
    status: input.status ?? "active",
    tags: input.tags ?? [],
    repoUrl: blankToNull(input.repoUrl),
    startDate: blankToNull(input.startDate),
    targetDate: blankToNull(input.targetDate),
  }
}

// ── Selection ────────────────────────────────────────────────────────────────

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : 0
  return Number.isNaN(t) ? 0 : t
}

/** Most recently opened first; projects never opened fall back to their last update. */
export function selectRecentlyOpenedProjects(projects: Project[], limit = 3): Project[] {
  return [...projects]
    .filter((p) => p.status !== "archived")
    .sort((a, b) => time(b.lastOpenedAt ?? b.updatedAt) - time(a.lastOpenedAt ?? a.updatedAt))
    .slice(0, limit)
}

/** Status filter for the "All projects" list; newest update first. */
export function filterProjectsByStatus(
  projects: Project[],
  status: ProjectStatus | "all",
): Project[] {
  return projects
    .filter((p) => status === "all" || p.status === status)
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
}

export function notesInProject(notes: NoteMeta[], projectId: string): NoteMeta[] {
  return notes.filter((note) => note.projectId === projectId)
}

/** The Decisions tab: Decision-type notes in the project, newest first. */
export function selectDecisionNotes(notes: NoteMeta[], projectId: string): NoteMeta[] {
  return notesInProject(notes, projectId)
    .filter((note) => note.noteType === "decision")
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
}
