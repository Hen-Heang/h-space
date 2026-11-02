import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import {
  normalizeProjectInput,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/note-projects"

import { isMissingSchemaError } from "./schema-errors"

// Note projects over kori_note_projects (owner-scoped by RLS). Same shape as
// notesApi: plain async functions, row↔camelCase mapping inline,
// requireUserId() on writes. Domain logic lives in lib/note-projects.ts.
export type { Project, ProjectInput } from "@/lib/note-projects"

type ProjectRow = {
  id: string
  name: string
  description: string
  project_type: ProjectType
  status: ProjectStatus
  tags: string[] | null
  repo_url: string | null
  start_date: string | null
  target_date: string | null
  last_opened_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, name, description, project_type, status, tags, repo_url, start_date, target_date, last_opened_at, created_at, updated_at"

/** Thrown when the projects migration hasn't been applied yet. */
export class ProjectsUnavailableError extends Error {
  constructor() {
    super("Projects aren't set up yet.")
    this.name = "ProjectsUnavailableError"
  }
}

function rethrow(error: unknown): never {
  if (isMissingSchemaError(error)) throw new ProjectsUnavailableError()
  throw error
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    projectType: row.project_type,
    status: row.status,
    tags: row.tags ?? [],
    repoUrl: row.repo_url,
    startDate: row.start_date,
    targetDate: row.target_date,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: ProjectInput) {
  const n = normalizeProjectInput(input)
  return {
    name: n.name,
    description: n.description,
    project_type: n.projectType,
    status: n.status,
    tags: n.tags,
    repo_url: n.repoUrl,
    start_date: n.startDate,
    target_date: n.targetDate,
  }
}

export const noteProjectsApi = {
  list: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from("kori_note_projects")
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
    if (error) rethrow(error)
    return ((data ?? []) as ProjectRow[]).map(toProject)
  },

  get: async (id: string): Promise<Project> => {
    const { data, error } = await supabase
      .from("kori_note_projects")
      .select(COLUMNS)
      .eq("id", id)
      .single()
    if (error) rethrow(error)
    return toProject(data as ProjectRow)
  },

  create: async (input: ProjectInput): Promise<Project> => {
    const userId = requireUserId()
    const { data, error } = await supabase
      .from("kori_note_projects")
      .insert({ user_id: userId, ...toRow(input) })
      .select(COLUMNS)
      .single()
    if (error) rethrow(error)
    return toProject(data as ProjectRow)
  },

  update: async (id: string, input: ProjectInput): Promise<Project> => {
    requireUserId()
    const { data, error } = await supabase
      .from("kori_note_projects")
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLUMNS)
      .single()
    if (error) rethrow(error)
    return toProject(data as ProjectRow)
  },

  /** Stamps last_opened_at for "Recently opened". Doesn't touch updated_at. */
  markOpened: async (id: string): Promise<void> => {
    requireUserId()
    const { error } = await supabase
      .from("kori_note_projects")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", id)
    if (error) rethrow(error)
  },
}
