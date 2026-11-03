"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { inboxApi, type InboxListParams } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { InboxItem, InboxItemInput, InboxItemStatus, InboxItemType } from "@/lib/inbox"

export const inboxQueryKey = (userId?: string | null, params?: InboxListParams) =>
  ["inbox", userId, params ?? {}] as const
export const inboxItemQueryKey = (id: string) => ["inbox-item", id] as const

/** Bounded list, refined further client-side by lib/inbox.ts's filterInboxItems. */
export function useInbox(params: InboxListParams = {}) {
  const userId = getUserId()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: inboxQueryKey(userId, params),
    queryFn: () => inboxApi.list(params),
    enabled: userId != null,
  })

  return {
    items: (data ?? []) as InboxItem[],
    loading: isPending,
    error: isError ? "Couldn't load your inbox." : "",
    /** Retry after an error. */
    refetch,
  }
}

export function useInboxItem(id: string) {
  const { data, isPending, isError } = useQuery({
    queryKey: inboxItemQueryKey(id),
    queryFn: () => inboxApi.get(id),
    enabled: Boolean(id),
  })

  return {
    item: data ?? null,
    loading: isPending,
    error: isError ? "Item not found." : "",
  }
}

export function useInboxMutations() {
  const queryClient = useQueryClient()
  const userId = getUserId()
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ["inbox", userId] })
  const invalidateItem = (id: string) =>
    queryClient.invalidateQueries({ queryKey: inboxItemQueryKey(id) })

  const capture = useMutation({
    mutationFn: (input: InboxItemInput) => inboxApi.create(input),
    onSuccess: () => invalidateList(),
  })

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<{
        title: string | null
        content: string
        itemType: InboxItemType
        tags: string[]
        eventAt: string | null
        goalId: string | null
        pinned: boolean
        status: InboxItemStatus
      }>
    }) => inboxApi.update(id, patch),
    onSuccess: (_res, { id }) => {
      invalidateList()
      invalidateItem(id)
    },
  })

  const togglePinned = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      inboxApi.togglePinned(id, pinned),
    onSuccess: (_res, { id }) => {
      invalidateList()
      invalidateItem(id)
    },
  })

  const archive = useMutation({
    mutationFn: (id: string) => inboxApi.archive(id),
    onSuccess: (_res, id) => {
      invalidateList()
      invalidateItem(id)
    },
  })

  const restore = useMutation({
    mutationFn: (id: string) => inboxApi.restore(id),
    onSuccess: (_res, id) => {
      invalidateList()
      invalidateItem(id)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => inboxApi.remove(id),
    onSuccess: () => invalidateList(),
  })

  const convertToNote = useMutation({
    mutationFn: (item: InboxItem) => inboxApi.convertToNote(item),
    onSuccess: (_res, item) => {
      invalidateList()
      invalidateItem(item.id)
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })

  const convertToTask = useMutation({
    mutationFn: ({ item, date }: { item: InboxItem; date: string }) =>
      inboxApi.convertToTask(item, date),
    onSuccess: (_res, { item }) => {
      invalidateList()
      invalidateItem(item.id)
    },
  })

  const convertToJournal = useMutation({
    mutationFn: (item: InboxItem) => inboxApi.convertToJournal(item),
    onSuccess: (_res, item) => {
      invalidateList()
      invalidateItem(item.id)
      queryClient.invalidateQueries({ queryKey: ["journal"] })
    },
  })

  return {
    capture,
    update,
    togglePinned,
    archive,
    restore,
    remove,
    convertToNote,
    convertToTask,
    convertToJournal,
  }
}
