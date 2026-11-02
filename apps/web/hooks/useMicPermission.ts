"use client"

import { useEffect, useState } from "react"

import type { MicPermission } from "@/lib/mic-access"

/**
 * The browser's microphone permission, kept live (it changes when the user
 * edits site settings). Returns "unknown" where it can't be queried — Firefox
 * rejects the "microphone" name and older Safari has no Permissions API — so
 * callers fall back to the speech-recognition error instead.
 */
export function useMicPermission(): MicPermission {
  const [permission, setPermission] = useState<MicPermission>("unknown")

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    let active = true
    const sync = () => {
      if (active && status) setPermission(status.state)
    }

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (!active) return
        status = result
        sync()
        status.addEventListener("change", sync)
      })
      .catch(() => {
        // Unsupported permission name — leave "unknown".
      })

    return () => {
      active = false
      status?.removeEventListener("change", sync)
    }
  }, [])

  return permission
}
