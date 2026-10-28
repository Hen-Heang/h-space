"use client"

import { useEffect, useState } from "react"

import { userApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

export type ProfileAvatar = {
  /** Object URL for the profile photo, or null when none is set. */
  url: string | null
  /** Up-to-two-letter fallback derived from the display name / email. */
  initials: string
  /** First word of the display name, or null when none is set. */
  firstName: string | null
}

function deriveInitials(displayName?: string | null, email?: string | null): string {
  const name = (displayName ?? "").trim()
  if (name) {
    const parts = name.split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const handle = (email ?? "").trim().split("@")[0]
  return handle ? handle.slice(0, 2).toUpperCase() : "ME"
}

// Cache the result for the session so the navbar, chat, and any other consumer
// share a single network round trip instead of each fetching the blob again.
let cache: { id: string; data: ProfileAvatar } | null = null
let inflight: Promise<ProfileAvatar> | null = null

async function load(userId: string): Promise<ProfileAvatar> {
  if (cache && cache.id === userId) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const user = await userApi.getById(userId).catch(() => null)
      const initials = deriveInitials(user?.displayName, user?.email)
      let url: string | null = null
      if (user?.hasProfileImage) {
        url = await userApi.getProfileImageUrl(userId).catch(() => null)
      }
      const firstName = (user?.displayName ?? "").trim().split(/\s+/)[0] || null
      const data: ProfileAvatar = { url, initials, firstName }
      // Don't cache a fallback from a failed fetch — retry on the next mount
      // instead of sticking with "ME" for the rest of the session.
      if (user) cache = { id: userId, data }
      return data
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Invalidate the cache after the user uploads a new photo (call from settings). */
export function refreshProfileImage() {
  cache = null
  inflight = null
}

/**
 * Current user's avatar (photo URL + initials fallback) and first name, fetched once and
 * cached for the session. Returns the cached value synchronously on remount.
 */
export function useProfileImage(): ProfileAvatar {
  const [data, setData] = useState<ProfileAvatar>(
    cache?.data ?? { url: null, initials: "ME", firstName: null },
  )

  useEffect(() => {
    const id = getUserId()
    if (!id) return
    let active = true
    load(id).then((d) => {
      if (active) setData(d)
    })
    return () => {
      active = false
    }
  }, [])

  return data
}
