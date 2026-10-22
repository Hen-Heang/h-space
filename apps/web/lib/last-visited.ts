// Tracks the last route visited inside each nav section so Today's "Continue
// where you left off" cards — and the Quick Switcher's Recent group — can
// deep-link back into whatever the user was actually doing, not just a fixed
// page. Purely local; no network, no per-render cost.

const STORAGE_KEY = "hengo-last-visited"
const RECENTS_KEY = "hengo-recent-routes"
const MAX_RECENTS = 5

/** Section ids that get "continue where you left off" tracking. */
export type WorkspaceId = "learn" | "plan" | "grow" | "memory" | "apps" | "ai"

type LastVisited = Partial<Record<WorkspaceId, string>>

function read(): LastVisited {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LastVisited) : {}
  } catch {
    return {}
  }
}

export function recordLastVisited(workspace: WorkspaceId, href: string) {
  try {
    const next = { ...read(), [workspace]: href }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
}

export function getLastVisited(workspace: WorkspaceId, fallback: string): string {
  return read()[workspace] ?? fallback
}

// ─── Recent destinations (Quick Switcher) ─────────────────────────────────────

/**
 * Most-recent-first list of nav item ids the user opened. Stores ids, not
 * hrefs, so a renamed/moved route can't resurrect a dead link.
 */
export function readRecentNavIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

export function recordRecentNavId(id: string) {
  try {
    const next = [id, ...readRecentNavIds().filter((existing) => existing !== id)].slice(
      0,
      MAX_RECENTS,
    )
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
}
