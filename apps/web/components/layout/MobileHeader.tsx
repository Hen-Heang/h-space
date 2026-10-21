"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Settings } from "lucide-react"

import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  allNavItems,
  getActiveNavItem,
  getSectionForPath,
  linkPath,
  type NavSearchParams,
} from "@/lib/navigation"

import { useMobileHeaderTitleValue } from "./mobile-header-title"

const ACTION_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/** A route is a "detail" view when it sits below a nav destination. */
export function isDetailRoute(pathname: string): boolean {
  return !allNavItems.some((item) => linkPath(item.href) === pathname)
}

/**
 * Contextual mobile header. Root pages get a title plus a full row of
 * actions; detail pages get `Back | Title | Search Settings` — the same two
 * affordances, rendered directly rather than folded into a "⋯" menu. The menu
 * held exactly Search and Settings, and on a settings sub-page one of the two
 * was a no-op ("Settings", from inside Settings); one tap to reach either is
 * strictly better than two everywhere else. Profile and level stay off this
 * bar, but Settings keeps an icon on both variants — V2's bottom bar has no
 * "More" sheet to hold it anymore (see `MobileBottomNav`), so this header is
 * the only chrome that offers it.
 * V2 Phase 7: the "Quick capture" action (Inbox) was dropped from both the
 * root action row and the detail-page menu — Inbox is on the hide list, and a
 * persistent header button was the last unconditional promotion of it left in
 * the shell. `openQuickCapture()` / `QuickCaptureDialog` are untouched, still
 * reachable by searching the Quick Switcher.
 */
export function MobileHeader({
  pathname,
  searchParams,
  onOpenSearch,
}: {
  pathname: string
  searchParams: NavSearchParams
  onOpenSearch: () => void
}) {
  const router = useRouter()
  const publishedTitle = useMobileHeaderTitleValue()
  const detail = isDetailRoute(pathname)

  const section = getSectionForPath(pathname, searchParams)
  const navLabel = getActiveNavItem(pathname, searchParams)?.label
  const title = publishedTitle ?? navLabel ?? section?.label ?? "H-Space"

  return (
    <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-background/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm">
      {detail && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className={ACTION_BUTTON}
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <h1
        className={`min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-foreground ${detail ? "" : "pl-2"}`}
      >
        {title}
      </h1>

      <button type="button" onClick={onOpenSearch} aria-label="Search" className={ACTION_BUTTON}>
        <Search size={20} />
      </button>
      <Link href="/settings" aria-label="Settings" className={ACTION_BUTTON}>
        <Settings size={20} />
      </Link>

      {/* Theme and notifications stay off detail pages: five 44px targets
          don't fit beside a back button and a title on a 390px screen, and
          both are one tap away on any root page. */}
      {!detail && (
        <>
          <ThemeToggle className="h-11 w-11 rounded-xl border-border bg-card shadow-sm" />
          <NotificationBell />
        </>
      )}
    </header>
  )
}
