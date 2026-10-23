"use client"

import { useState } from "react"
import Link from "next/link"

import { MoreSheet } from "@/components/layout/MoreSheet"
import {
  isMoreRoute,
  isNavigationItemActive,
  mobileNavItems,
  moreIcon as MoreIcon,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

const TAB =
  "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

function TabLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "w-full truncate px-0.5 text-center text-[11px] leading-none",
        active ? "font-semibold" : "font-medium",
      )}
    >
      {children}
    </span>
  )
}

/**
 * Mobile bottom bar: Home · Plan · Learn · Apps (`mobileNavItems`) plus a
 * "More" trigger that opens `MoreSheet` (Notes, Growth, AI Assistant,
 * Settings, and every page by workspace). More reads as current on any route
 * none of the four tabs owns.
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
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = isMoreRoute(pathname, searchParams)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <ul className="mx-auto flex max-w-lg items-stretch gap-0.5 px-2 py-1">
        {mobileNavItems.map((item) => {
          const active = isNavigationItemActive({ pathname, searchParams, item })
          const Icon = item.icon
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 2} aria-hidden className="shrink-0" />
                <TabLabel active={active}>{item.shortLabel ?? item.label}</TabLabel>
              </Link>
            </li>
          )
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            className={cn(TAB, moreActive ? "text-primary" : "text-muted-foreground")}
          >
            <MoreIcon
              size={20}
              strokeWidth={moreActive ? 2.3 : 2}
              aria-hidden
              className="shrink-0"
            />
            <TabLabel active={moreActive}>More</TabLabel>
          </button>
        </li>
      </ul>
      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        pathname={pathname}
        searchParams={searchParams}
      />
    </nav>
  )
}
