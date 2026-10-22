"use client"

import { useState } from "react"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

import { SpacesSheet } from "@/components/layout/SpacesSheet"
import {
  isNavigationItemActive,
  isSpacesRoute,
  primaryNavItems,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

const TAB =
  "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

function TabLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "w-full truncate px-0.5 text-center text-xs leading-none",
        active ? "font-semibold" : "font-medium",
      )}
    >
      {children}
    </span>
  )
}

/**
 * Mobile bottom bar: four workspace tabs — Today, Goals, Learning, Notes
 * (`primaryNavItems`) — plus a "Spaces" trigger that opens every workspace
 * (`SpacesSheet`). Spaces reads as current on any route none of the four
 * tabs owns (Growth, My Apps, AI Assistant, Settings, …).
 *
 * A stable elevated bottom surface — one border, one shadow, no glass
 * container, no sliding pill, no per-icon scaling.
 *
 * When the soft keyboard is open the whole element is unmounted by `AppShell`
 * rather than hidden, so nothing inside stays in the tab order.
 */
export function MobileBottomNav({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  const [spacesOpen, setSpacesOpen] = useState(false)
  const spacesActive = isSpacesRoute(pathname, searchParams)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch gap-0.5 px-2 py-1.5">
        {primaryNavItems.map((item) => {
          const active = isNavigationItemActive({ pathname, searchParams, item })
          const Icon = item.icon
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                  className={cn("shrink-0", item.color, !active && "opacity-70")}
                />
                <TabLabel active={active}>{item.shortLabel ?? item.label}</TabLabel>
              </Link>
            </li>
          )
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSpacesOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={spacesOpen}
            className={cn(TAB, spacesActive ? "text-primary" : "text-muted-foreground")}
          >
            <LayoutGrid
              size={21}
              strokeWidth={spacesActive ? 2.4 : 2}
              aria-hidden
              className={cn("shrink-0", !spacesActive && "opacity-70")}
            />
            <TabLabel active={spacesActive}>Spaces</TabLabel>
          </button>
        </li>
      </ul>
      <SpacesSheet
        open={spacesOpen}
        onOpenChange={setSpacesOpen}
        pathname={pathname}
        searchParams={searchParams}
      />
    </nav>
  )
}
