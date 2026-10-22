"use client"

import { Sparkles } from "lucide-react"

import { QuickSwitcher } from "@/components/app/quick-switcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { openHengoCoach } from "@/lib/hengo-coach-bus"
import {
  getActiveNavItem,
  getSectionForPath,
  linkPath,
  type NavSearchParams,
} from "@/lib/navigation"

import { BreadcrumbTrail } from "./PageHeader"
import { ProfileMenu } from "./ProfileMenu"

/**
 * Sticky top bar for tablet + desktop. No Hengo branding (the sidebar/rail
 * owns that) and no LevelBadge (level lives on Today / Progress / Profile now,
 * and having it here refetched the achievements summary on every route change).
 */
export function DesktopHeader({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  const section = getSectionForPath(pathname, searchParams)
  const item = getActiveNavItem(pathname, searchParams)
  const title = item?.label ?? section?.label ?? "H-Space"

  // Don't repeat the title as its own parent crumb (e.g. Today), and don't
  // show a crumb that links back to the page you're on (e.g. "Korean
  // Learning" on /learn, the section's own landing route).
  const crumbs =
    section && section.label !== title && linkPath(section.href) !== pathname
      ? [{ label: section.label, href: section.href }]
      : []

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-sm">
      <div className="min-w-0">
        {crumbs.length > 0 && <BreadcrumbTrail items={crumbs} />}
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {item?.description && (
          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          id="hengo-coach-header-trigger"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openHengoCoach()}
          className="h-9 gap-1.5 rounded-lg px-3"
        >
          <Sparkles data-icon="inline-start" className="size-4 text-teal-500" aria-hidden="true" />
          Hengo Coach
        </Button>
        <QuickSwitcher />
        <ThemeToggle className="h-11 w-11 rounded-xl border-border bg-card shadow-sm" />
        <NotificationBell />
        <ProfileMenu collapsed side="bottom" align="end" className="size-11" />
      </div>
    </header>
  )
}
