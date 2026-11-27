"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { getUserId, onAuthChange } from "@/lib/auth-store"
import { shouldClearUserCache } from "@/lib/auth-v2"

/**
 * Drops every cached query when the signed-in account changes - sign-out,
 * an ended session, or another account signing in (also from another tab) -
 * so nothing the previous user loaded can render for the next one (Auth V2
 * SES-04). A token refresh for the same user keeps the cache.
 */
export function UserCacheReset() {
  const queryClient = useQueryClient()
  const lastUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    lastUserId.current = getUserId()
    return onAuthChange(() => {
      const next = getUserId()
      if (shouldClearUserCache(lastUserId.current, next)) queryClient.clear()
      lastUserId.current = next
    })
  }, [queryClient])

  return null
}
