"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { History } from "lucide-react"

import { resolveRecentDestinations } from "@/lib/home-dashboard"
import { readRecentNavIds } from "@/lib/last-visited"
import { allNavItems, todayItem, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ITEMS_BY_ID: ReadonlyMap<string, NavItem> = new Map(
  allNavItems.filter((item) => !item.soon).map((item) => [item.id, item]),
)

// Recents are written by navigation (AppShell's RecentTracker), never while
// this card is on screen, so there is nothing to subscribe to.
const subscribeNoop = () => () => {}

/**
 * "Pick up where you left off" — the same local recent-destination list the
 * Quick Switcher shows (recorded by AppShell's RecentTracker). Renders
 * nothing until there is history, so a first visit stays uncluttered.
 */
export function ContinueCard() {
  // localStorage is an external store (see hooks/useSidebarState.ts). The
  // snapshot is a joined string so it stays referentially stable between
  // reads; the server snapshot is empty, so first paint renders nothing.
  const recentKey = useSyncExternalStore(
    subscribeNoop,
    () => readRecentNavIds().join(","),
    () => "",
  )
  const recent = useMemo(
    () =>
      resolveRecentDestinations(recentKey ? recentKey.split(",") : [], ITEMS_BY_ID, {
        excludeIds: [todayItem.id],
      }),
    [recentKey],
  )

  if (recent.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <History size={14} strokeWidth={2.5} className="text-muted-foreground" />
        Continue
      </h3>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {recent.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <item.icon
                size={15}
                className={cn("shrink-0", item.color ?? "text-muted-foreground")}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
