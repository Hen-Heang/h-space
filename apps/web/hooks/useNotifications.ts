"use client"

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { notificationsApi, getApiErrorMessage, type GoalNotification } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

// Ported from Orbit's notification system. Supabase realtime is deferred, so the
// bell polls every 60s and refetches after each action (docs/INTEGRATION.md: "Realtime
// patching is deferred → replaced by Query invalidation").

export const notificationsQueryKey = (userId?: string | null) =>
  ["goal-notifications", userId] as const

export function useNotifications() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const key = notificationsQueryKey(userId)

  const {
    data: notifications = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: key,
    queryFn: () => notificationsApi.list(false),
    enabled: userId != null,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: key }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, userId],
  )

  const setLocal = useCallback(
    (updater: (prev: GoalNotification[]) => GoalNotification[]) =>
      queryClient.setQueryData<GoalNotification[]>(key, (prev) => updater(prev || [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, userId],
  )

  const markRead = useCallback(
    async (id: string) => {
      setLocal((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      try {
        await notificationsApi.markRead(id)
      } catch (e) {
        void invalidate()
        toast.error("Could not update notification", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [setLocal, invalidate],
  )

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return
    setLocal((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await Promise.all(unread.map((n) => notificationsApi.markRead(n.id)))
    } catch (e) {
      void invalidate()
      toast.error("Could not mark all read", {
        description: getApiErrorMessage(e, "Please try again."),
      })
    }
  }, [notifications, setLocal, invalidate])

  const respond = useCallback(
    async (id: string, accept: boolean) => {
      setLocal((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read: true, invitationStatus: accept ? "accepted" : "declined" }
            : n,
        ),
      )
      try {
        await notificationsApi.respond(id, accept)
        toast.success(accept ? "Invitation accepted" : "Invitation declined")
        // Accepting adds goal membership — refresh goals too.
        if (accept) void queryClient.invalidateQueries({ queryKey: ["goals"] })
      } catch (e) {
        void invalidate()
        toast.error("Could not respond to invitation", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [setLocal, invalidate, queryClient],
  )

  return {
    notifications,
    unreadCount,
    isLoading: isPending,
    isError,
    markRead,
    markAllRead,
    respond,
    refresh: invalidate,
  }
}
