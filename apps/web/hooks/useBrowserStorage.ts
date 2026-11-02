"use client"

import { useCallback, useSyncExternalStore } from "react"

// A raw string in localStorage / sessionStorage, read as an external store
// (same reasoning as useSidebarState: no mount effect, no cascading render)
// and kept in sync across every component using the same key. For per-viewer
// UI conveniences only — storage can be empty, blocked, or cleared, so callers
// always have a default.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

type StorageKind = "local" | "session"

function storageFor(kind: StorageKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** `[value, write]` — `value` is null when unset, unavailable, or during prerender. */
export function useBrowserStorage(kind: StorageKind, key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return storageFor(kind)?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    () => null,
  )

  const write = useCallback(
    (next: string) => {
      try {
        storageFor(kind)?.setItem(key, next)
      } catch {
        // Private mode / blocked storage: nothing is remembered this time.
      }
      listeners.forEach((listener) => listener())
    },
    [kind, key],
  )

  return [value, write] as const
}
