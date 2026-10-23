// Pure helpers for the private My Apps catalog (`/apps`): search, category
// filtering, favorites ordering, and the favorites' browser persistence.
// The project facts themselves stay in `lib/projects.ts`, shared with the
// public landing page — nothing here is written back to it.

import type { HSpaceProject } from "@/lib/projects"

export const APP_FAVORITES_STORAGE_KEY = "hengo-app-favorites"

export type AppCatalogFilter = {
  query: string
  /** A project `area`, or "all". */
  category: string
  favoritesOnly: boolean
}

/** Distinct categories in catalog order — the filter chips' source. */
export function appCategories(projects: HSpaceProject[]): string[] {
  return Array.from(new Set(projects.map((project) => project.area)))
}

/**
 * Projects matching the filter, favorites first, otherwise in catalog order.
 * The query matches name, category, description, and technologies.
 */
export function filterApps(
  projects: HSpaceProject[],
  filter: AppCatalogFilter,
  favorites: ReadonlySet<string>,
): HSpaceProject[] {
  const query = filter.query.trim().toLowerCase()
  const matches = projects.filter((project) => {
    if (filter.category !== "all" && project.area !== filter.category) return false
    if (filter.favoritesOnly && !favorites.has(project.id)) return false
    if (!query) return true
    return [project.name, project.area, project.description, ...project.stack].some((text) =>
      text.toLowerCase().includes(query),
    )
  })
  // Array.prototype.sort is stable, so non-favorites keep catalog order.
  return matches.sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)))
}

/** The raw stored value — a stable string, so it can be a `useSyncExternalStore` snapshot. */
export function readAppFavoritesRaw(): string {
  if (typeof window === "undefined") return "[]"
  try {
    return window.localStorage.getItem(APP_FAVORITES_STORAGE_KEY) ?? "[]"
  } catch {
    // Private mode / storage disabled — no favorites.
    return "[]"
  }
}

export function parseAppFavorites(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
  } catch {
    // A corrupted value — treat as no favorites rather than breaking the page.
    return []
  }
}

export function readAppFavorites(): string[] {
  return parseAppFavorites(readAppFavoritesRaw())
}

export function writeAppFavorites(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(APP_FAVORITES_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* storage unavailable — favorites still work for this session */
  }
}

export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]
}
