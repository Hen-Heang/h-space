"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowUpRight, Star } from "lucide-react"

import { filterApps, parseAppFavorites, readAppFavoritesRaw } from "@/lib/apps-catalog"
import { hSpaceProjects } from "@/lib/projects"

// Favorites only change on /apps, never while Overview is on screen.
const subscribeNoop = () => () => {}

/**
 * Overview's Quick access row: the in-app destinations from the My Apps
 * catalog, favorites first (same localStorage favorites as `/apps`). External
 * repositories stay on `/apps` — this row is for jumping into something.
 */
export function QuickAccess() {
  const raw = useSyncExternalStore(subscribeNoop, readAppFavoritesRaw, () => "[]")
  const favorites = useMemo(() => new Set(parseAppFavorites(raw)), [raw])

  const links = filterApps(
    hSpaceProjects,
    { query: "", category: "all", favoritesOnly: false },
    favorites,
  ).flatMap((project) =>
    project.links
      .filter((link) => link.href.startsWith("/"))
      .map((link) => ({ id: project.id, name: project.name, href: link.href })),
  )

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {favorites.has(link.id) && (
            <Star size={13} className="fill-amber-400 text-amber-400" aria-label="Favorite" />
          )}
          {link.name}
        </Link>
      ))}
      <Link
        href="/apps"
        className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        All apps
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  )
}
