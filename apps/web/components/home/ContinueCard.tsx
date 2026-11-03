"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { History } from "lucide-react"

import { resolveRecentDestinations } from "@/lib/home-dashboard"
import { readRecentNavIds } from "@/lib/last-visited"
import { allNavItems, todayItem, type NavItem } from "@/lib/navigation"

import { DASHBOARD_ROW, DASHBOARD_ROWS, DashboardCard } from "./dashboard-card"

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
    <DashboardCard title="Continue" icon={History}>
      <ul className={DASHBOARD_ROWS}>
        {recent.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`${DASHBOARD_ROW} text-base text-foreground hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring`}
            >
              {/* Neutral, like the nav — per-item colours were decoration. */}
              <item.icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}
