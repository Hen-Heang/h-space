"use client"

import { useMemo, useSyncExternalStore } from "react"

import { projectIcons } from "@/components/home/MyAppsSection"
import { filterApps, parseAppFavorites, readAppFavoritesRaw } from "@/lib/apps-catalog"
import { hSpaceProjects } from "@/lib/projects"

import { AppShortcut } from "./home-primitives"

// Favorites only change on /apps, never while Overview is on screen.
const subscribeNoop = () => () => {}

/**
 * A short list of app destinations, with the same favorites as `/apps` first.
 * The complete, searchable catalog remains at `/apps`.
 */
export function QuickAccess() {
  const raw = useSyncExternalStore(subscribeNoop, readAppFavoritesRaw, () => "[]")
  const favorites = useMemo(() => new Set(parseAppFavorites(raw)), [raw])

  const links = filterApps(
    hSpaceProjects,
    { query: "", category: "all", favoritesOnly: false },
    favorites,
  )
    .flatMap((project) =>
      project.links
        .filter((link) => link.kind === "app")
        .map((link) => ({ project, href: link.href })),
    )
    .slice(0, 4)

  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-4">
      {links.map(({ project, href }) => {
        const Icon = projectIcons[project.id]
        const external = !href.startsWith("/")

        return (
          <AppShortcut
            key={`${project.id}-${href}`}
            href={href}
            title={project.name}
            icon={Icon}
            favorite={favorites.has(project.id)}
            external={external}
          />
        )
      })}
    </ul>
  )
}
