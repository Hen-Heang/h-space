"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { notesApi, type NoteInput, type NoteMeta } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export const notesQueryKey = (userId?: string | null) => ["notes", userId] as const
export const noteQueryKey = (slug: string) => ["note", slug] as const
export const noteSearchQueryKey = (userId?: string | null, query?: string) =>
  ["notes-search", userId, query] as const

// List of note metadata for the library/index page.
export function useNotes() {
  const userId = getUserId()
  const { data, isPending, isError } = useQuery({
    queryKey: notesQueryKey(userId),
    queryFn: notesApi.list,
    enabled: userId != null,
  })

  return {
    notes: (data ?? []) as NoteMeta[],
    loading: isPending,
    error: isError ? "Failed to load notes." : "",
  }
}

// Single note (content + meta) for the reader/editor.
export function useNote(slug: string) {
  const { data, isPending, isError } = useQuery({
    queryKey: noteQueryKey(slug),
    queryFn: () => notesApi.get(slug),
    enabled: Boolean(slug),
  })

  return {
    note: data ?? null,
    loading: isPending,
    error: isError ? "Note not found." : "",
  }
}

/**
 * Server-side full-text search (title/description/content) for a debounced
 * query — the metadata-only list above can't search content, and downloading
 * every note to filter client-side isn't acceptable at scale. Callers should
 * fall back to `useNotes()`'s metadata filter when `query` is empty.
 */
export function useNoteSearch(query: string, delayMs = 300) {
  const userId = getUserId()
  const debouncedQuery = useDebouncedValue(query.trim(), delayMs)
  const { data, isPending, isError } = useQuery({
    queryKey: noteSearchQueryKey(userId, debouncedQuery),
    queryFn: () => notesApi.search(debouncedQuery),
    enabled: userId != null && debouncedQuery.length > 0,
  })

  return {
    results: (data ?? []) as NoteMeta[],
    searching: debouncedQuery.length > 0 && isPending,
    error: isError ? "Search failed." : "",
  }
}

export function useNoteMutations() {
  const queryClient = useQueryClient()
  const userId = getUserId()
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: notesQueryKey(userId) })

  const create = useMutation({
    mutationFn: (data: NoteInput) => notesApi.create(data),
    onSuccess: () => invalidateList(),
  })

  const update = useMutation({
    mutationFn: ({
      slug,
      data,
      expectedUpdatedAt,
    }: {
      slug: string
      data: Partial<NoteInput>
      /** Refuse the save if the note changed since this version (see notesApi.update). */
      expectedUpdatedAt?: string
    }) => notesApi.update(slug, data, { expectedUpdatedAt }),
    onSuccess: (_res, { slug }) => {
      invalidateList()
      queryClient.invalidateQueries({ queryKey: noteQueryKey(slug) })
    },
  })

  const togglePinned = useMutation({
    mutationFn: ({ slug, pinned }: { slug: string; pinned: boolean }) =>
      notesApi.togglePinned(slug, pinned),
    onSuccess: (_res, { slug }) => {
      invalidateList()
      queryClient.invalidateQueries({ queryKey: noteQueryKey(slug) })
    },
  })

  const remove = useMutation({
    mutationFn: (slug: string) => notesApi.remove(slug),
    onSuccess: () => invalidateList(),
  })

  return { create, update, togglePinned, remove }
}
