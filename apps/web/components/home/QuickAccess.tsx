"use client"

import { useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowUpRight, Star } from "lucide-react"

import { projectIcons } from "@/components/home/MyAppsSection"
import { filterApps, parseAppFavorites, readAppFavoritesRaw } from "@/lib/apps-catalog"
import { hSpaceProjects, type HSpaceProject } from "@/lib/projects"
import { cn } from "@/lib/utils"

// Favorites only change on /apps, never while Overview is on screen.
const subscribeNoop = () => () => {}

const ICON_TONES: Partial<Record<HSpaceProject["id"], string>> = {
  "hengo-learning": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "h-vault": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  luyra: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

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
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {links.map(({ project, href }) => {
        const Icon = projectIcons[project.id]
        const external = !href.startsWith("/")
        const className =
          "group flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-950/[0.03] outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  ICON_TONES[project.id] ?? "bg-primary/10 text-primary",
                )}
              >
                <Icon size={19} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {project.area}
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-base font-bold text-foreground">
              {favorites.has(project.id) && (
                <Star size={13} className="fill-amber-400 text-amber-400" aria-label="Favorite" />
              )}
              {project.name}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{project.description}</p>
            <span className="mt-4 flex items-center gap-1 border-t border-border pt-3 text-xs font-semibold text-primary">
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
