"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { getActiveTab, workspaceTabs, type NavSectionId } from "@/lib/navigation"
import { cn } from "@/lib/utils"

/**
 * A workspace's local navigation — Planner's Tasks · Goals · Calendar · …,
 * Notes' Notes · Memories · Timeline — from `workspaceTabs` in
 * `lib/navigation.ts`. This is where a workspace's pages live instead of the
 * global sidebar. Real links, so back/forward, middle-click and pasted URLs
 * behave normally; the row scrolls sideways on narrow screens instead of
 * wrapping. `actions` sits at the row's end (wrapping below on phones) so a
 * workspace's one primary action lives beside its tabs, not in a second hero.
 */
export function WorkspaceTabs({
  sectionId,
  actions,
  className,
}: {
  sectionId: NavSectionId
  actions?: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const tabs = workspaceTabs[sectionId] ?? []
  const active = getActiveTab(tabs, pathname)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <nav aria-label="Workspace sections" className="no-scrollbar -mb-px min-w-0 overflow-x-auto">
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const current = tab.id === active?.id
            return (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center whitespace-nowrap rounded-t-md border-b-2 px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    current
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-2">{actions}</div>}
    </div>
  )
}
