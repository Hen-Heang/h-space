"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { noteProjectsApi, ProjectsUnavailableError, type ProjectInput } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { Project } from "@/lib/note-projects"

export const noteProjectsQueryKey = (userId?: string | null) => ["note-projects", userId] as const
export const noteProjectQueryKey = (id: string) => ["note-project", id] as const

/**
 * All of the user's note projects. `unavailable` is true when the projects
 * migration hasn't been applied yet — callers show a "not set up" state
 * instead of an error, and the rest of Notes keeps working.
 */
export function useNoteProjects() {
  const userId = getUserId()
  const { data, isPending, isError, error } = useQuery({
    queryKey: noteProjectsQueryKey(userId),
    queryFn: noteProjectsApi.list,
    enabled: userId != null,
    retry: (count, err) => !(err instanceof ProjectsUnavailableError) && count < 2,
  })
  const unavailable = error instanceof ProjectsUnavailableError

  return {
    projects: (data ?? []) as Project[],
    loading: isPending,
    unavailable,
    error: isError && !unavailable ? "Failed to load projects." : "",
  }
}

export function useNoteProject(id: string) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: noteProjectQueryKey(id),
    queryFn: () => noteProjectsApi.get(id),
    enabled: Boolean(id),
    retry: false,
  })

  return {
    project: data ?? null,
    loading: isPending,
    unavailable: error instanceof ProjectsUnavailableError,
    error: isError ? "Project not found." : "",
  }
}

export function useNoteProjectMutations() {
  const queryClient = useQueryClient()
  const userId = getUserId()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: noteProjectsQueryKey(userId) })

  const create = useMutation({
    mutationFn: (input: ProjectInput) => noteProjectsApi.create(input),
    onSuccess: () => invalidateList(),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) =>
      noteProjectsApi.update(id, input),
    onSuccess: (project) => {
      invalidateList()
      queryClient.setQueryData(noteProjectQueryKey(project.id), project)
    },
  })

  /** Fire-and-forget "Recently opened" stamp; failures are harmless. */
  const markOpened = useMutation({
    mutationFn: (id: string) => noteProjectsApi.markOpened(id),
    onSuccess: () => invalidateList(),
  })

  return { create, update, markOpened }
}

export const noteProjectAiAccessQueryKey = (id: string) => ["note-project-ai-access", id] as const

/**
 * The project's "Allow AI access" switch. `enabled` is null while loading or
 * when the switch isn't set up on this database yet (callers hide it then).
 */
export function useProjectAiAccess(id: string) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: noteProjectAiAccessQueryKey(id),
    queryFn: () => noteProjectsApi.getAiAccess(id),
    enabled: Boolean(id),
    retry: false,
  })

  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) => noteProjectsApi.setAiAccess(id, enabled),
    onSuccess: (enabled) => queryClient.setQueryData(noteProjectAiAccessQueryKey(id), enabled),
  })

  return { enabled: isPending ? null : (data ?? null), setEnabled }
}
