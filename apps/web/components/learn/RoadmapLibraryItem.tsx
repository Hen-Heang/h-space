"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { ChevronRight, Map as MapIcon } from "lucide-react"

import {
  getRoadmapProgress,
  parseCompletedTopics,
  ROADMAP_STORAGE_KEY,
} from "@/lib/roadmap-progress"

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function readStored(): string {
  try {
    return window.localStorage.getItem(ROADMAP_STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

/**
 * The /roadmap study plan's door from the Learning hub's Library, with where
 * you are in it. It used to be a card on the Planner's Overview tab, where it
 * had nothing to do with goals. Progress lives in this browser
 * (lib/roadmap-progress.ts); the server render shows the start until it loads.
 */
export function RoadmapLibraryItem() {
  const stored = useSyncExternalStore(subscribe, readStored, () => "")
  const progress = useMemo(() => getRoadmapProgress(parseCompletedTopics(stored)), [stored])

  return (
    <li>
      <Link
        href="/roadmap"
        className="group flex min-h-14 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <MapIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">Dev roadmap</span>
          <span className="block truncate text-xs text-muted-foreground">
            Phase {progress.phase} · {progress.title} · {progress.overallPct}%
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}
