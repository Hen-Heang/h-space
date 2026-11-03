"use client"

import { Sparkles } from "lucide-react"

import { QuickSwitcher } from "@/components/app/quick-switcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { openHengoCoach } from "@/lib/hengo-coach-bus"
import { type NavSearchParams } from "@/lib/navigation"

import { getHeaderTrail } from "./header-trail"
import { BreadcrumbTrail } from "./PageHeader"

/**
 * Sticky top bar for tablet + desktop: where you are (`Workspace › Page`, the
 * page name as the document's `h1`) on the left, global actions on the
 * right. No branding or account menu (the sidebar / tablet rail own those)
 * and no page description — a workspace's own header carries any copy, so
 * nothing is said twice.
 */
export function DesktopHeader({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  const { title, crumbs } = getHeaderTrail(pathname, searchParams)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 pl-6 pr-[max(1.5rem,env(safe-area-inset-right))] backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-1.5">
        {crumbs.length > 0 && (
          <>
            <BreadcrumbTrail items={crumbs} className="shrink-0 text-sm" />
            <span aria-hidden className="text-muted-foreground/60">
              /
            </span>
          </>
        )}
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <QuickSwitcher />
        <Button
          id="hengo-coach-header-trigger"
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openHengoCoach()}
          className="h-9 gap-1.5 rounded-md px-3"
        >
          <Sparkles data-icon="inline-start" className="size-4 text-primary" aria-hidden="true" />
          AI Assistant
        </Button>
        <ThemeToggle className="size-9 rounded-md border-border bg-transparent shadow-none" />
        <NotificationBell className="size-9 rounded-md border-transparent bg-transparent shadow-none hover:bg-accent" />
      </div>
    </header>
  )
}
