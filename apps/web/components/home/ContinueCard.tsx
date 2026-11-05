"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { PageSection } from "@/components/ui/page-section"
import { RowList } from "@/components/ui/row-list"
import { resolveRecentDestinations } from "@/lib/home-dashboard"
import { readRecentNavIds } from "@/lib/last-visited"
import { allNavItems, todayItem, type NavItem } from "@/lib/navigation"

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
      }).slice(0, 3),
    [recentKey],
  )

  if (recent.length === 0) return null

  return (
    <PageSection title="Continue">
      <RowList className="grid grid-cols-1 sm:grid-cols-3 sm:divide-y-0 sm:gap-x-6">
        {recent.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-14 min-w-0 items-center gap-3 rounded-md px-2 py-2 text-base text-foreground outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Neutral, like the nav — per-item colours were decoration. */}
              <item.icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="line-clamp-2 min-w-0 flex-1 break-words">{item.label}</span>
              <ArrowUpRight
                size={14}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </RowList>
    </PageSection>
  )
}
