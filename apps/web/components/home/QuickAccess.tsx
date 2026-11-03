"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowUpRight, Star } from "lucide-react"

import { projectIcons } from "@/components/home/MyAppsSection"
import { filterApps, parseAppFavorites, readAppFavoritesRaw } from "@/lib/apps-catalog"
import { hSpaceProjects } from "@/lib/projects"

// Favorites only change on /apps, never while Overview is on screen.
const subscribeNoop = () => () => {}

/**
 * Overview's My Apps grid (Figma "My Apps" cards): the in-app destinations
 * from the My Apps catalog, favorites first (same localStorage favorites as
 * `/apps`). External repositories stay on `/apps` — this grid is for jumping
 * into something.
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
      .filter((link) => link.kind === "app")
      .map((link) => ({ project, href: link.href })),
  )

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {links.map(({ project, href }) => {
        const Icon = projectIcons[project.id]
        const external = !href.startsWith("/")
        // A visual catalogue, so a grid of surfaces — but flat: no shadow, no
        // hover lift, one neutral icon tile instead of a colour per app.
        const className =
          "app-surface group flex h-full min-w-0 flex-col p-4 outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
        const body = (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                  {favorites.has(project.id) && (
                    <Star
                      size={14}
                      className="shrink-0 fill-amber-400 text-amber-400"
                      aria-label="Favorite"
                    />
                  )}
                  <span className="truncate">{project.name}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{project.area}</span>
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
            <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-primary">
              Open app
              <ArrowUpRight
                size={13}
                aria-hidden="true"
                className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
              />
              {external && <span className="sr-only"> (opens in a new tab)</span>}
            </span>
          </>
        )

        return (
          <li key={`${project.id}-${href}`}>
            {external ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {body}
              </a>
            ) : (
              <Link href={href} className={className}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
