"use client"

import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Github,
  GraduationCap,
  Search,
  ShoppingBag,
  Star,
  Vault,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  appCategories,
  filterApps,
  parseAppFavorites,
  readAppFavorites,
  readAppFavoritesRaw,
  toggleFavorite,
  writeAppFavorites,
} from "@/lib/apps-catalog"
import { hSpaceProjects, type HSpaceProject } from "@/lib/projects"
import { cn } from "@/lib/utils"

const projectIcons: Record<HSpaceProject["id"], LucideIcon> = {
  "hengo-learning": GraduationCap,
  "h-vault": Vault,
  luyra: WalletCards,
  "h-phsar": ShoppingBag,
  portfolio: BriefcaseBusiness,
}

// Favorites live in localStorage — an external store — so they're read
// through useSyncExternalStore (same pattern as `useSidebarState`).
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function useAppFavorites() {
  const raw = useSyncExternalStore(subscribe, readAppFavoritesRaw, () => "[]")
  const favorites = useMemo(() => new Set(parseAppFavorites(raw)), [raw])
  const toggle = useCallback((id: string) => {
    writeAppFavorites(toggleFavorite(readAppFavorites(), id))
    listeners.forEach((listener) => listener())
  }, [])
  return { favorites, toggle }
}

const CHIP =
  "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

function ProjectLink({ link }: { link: HSpaceProject["links"][number] }) {
  const className =
    "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
  const Icon = link.kind === "github" ? Github : ArrowUpRight

  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={className}>
        <Icon className="size-4" aria-hidden="true" />
        {link.label}
      </Link>
    )
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      <Icon className="size-4" aria-hidden="true" />
      {link.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * The private My Apps catalog: every project in `lib/projects.ts` with
 * search, category filter, and favorites. The public landing page renders
 * the same facts through `MyAppsSection` as a portfolio — this is the
 * workspace view, so favorites are personal and stored in this browser only.
 * No project status is shown: the registry doesn't record a verified one.
 */
export function AppsCatalog() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { favorites, toggle } = useAppFavorites()

  const categories = appCategories(hSpaceProjects)
  const visible = filterApps(hSpaceProjects, { query, category, favoritesOnly }, favorites)
  const filtered = query !== "" || category !== "all" || favoritesOnly

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps"
            aria-label="Search apps"
            className="h-9 pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Filter by category"
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        >
          {["all", ...categories].map((value) => {
            const selected = category === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(value)}
                className={cn(
                  CHIP,
                  selected
                    ? "border-foreground/20 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "all" ? "All" : value}
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn(
              CHIP,
              favoritesOnly
                ? "border-foreground/20 bg-accent text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Star
              size={14}
              aria-hidden="true"
              className={favoritesOnly ? "fill-amber-400 text-amber-400" : undefined}
            />
            Favorites
          </button>
        </div>
      </div>

      <p className="sr-only" role="status">
        {visible.length} {visible.length === 1 ? "app" : "apps"} shown
      </p>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No apps match.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {favoritesOnly && favorites.size === 0
              ? "Star an app to keep it at the top of this list."
              : "Try a different search or category."}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setCategory("all")
                setFavoritesOnly(false)
              }}
              className="mt-3 inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => {
            const Icon = projectIcons[project.id]
            const favorite = favorites.has(project.id)
            return (
              <li key={project.id}>
                <article className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {project.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">{project.area}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(project.id)}
                      aria-pressed={favorite}
                      aria-label={
                        favorite
                          ? `Remove ${project.name} from favorites`
                          : `Add ${project.name} to favorites`
                      }
                      className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        size={16}
                        aria-hidden="true"
                        className={favorite ? "fill-amber-400 text-amber-400" : undefined}
                      />
                    </button>
                  </div>

                  <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>

                  <ul
                    aria-label={`${project.name} technology stack`}
                    className="mt-3 flex flex-wrap gap-1.5"
                  >
                    {project.stack.map((technology) => (
                      <li
                        key={technology}
                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {technology}
                      </li>
                    ))}
                  </ul>

                  <div className="-mx-1 mt-3 flex flex-wrap gap-1 border-t border-border pt-2">
                    {project.links.map((link) => (
                      <ProjectLink key={`${project.id}-${link.label}`} link={link} />
                    ))}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
