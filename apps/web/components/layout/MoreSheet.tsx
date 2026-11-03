"use client"

import { ChevronRight } from "lucide-react"

import { NavRow } from "@/components/layout/NavItem"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  browseSections,
  isNavigationItemActive,
  moreComingSoon,
  moreNavItems,
  type NavSearchParams,
} from "@/lib/navigation"

const chevron = <ChevronRight size={16} aria-hidden className="shrink-0 opacity-40" />

/**
 * The mobile bottom bar's "More" sheet. It leads with the destinations that
 * have no tab of their own — Notes, Growth, the AI Assistant, Settings
 * (`moreNavItems`) — then lists every shipped page grouped by workspace
 * (`browseSections`), so on a phone every route keeps a tappable door even
 * when only its workspace page links to it on desktop.
 */
export function MoreSheet({
  open,
  onOpenChange,
  pathname,
  searchParams,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  searchParams: NavSearchParams
}) {
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* pr-14 keeps the theme switch clear of the sheet's close button. */}
        <SheetHeader className="flex-row items-center justify-between gap-3 pb-1 pr-14">
          <SheetTitle>More</SheetTitle>
          {/* The phone's theme switch (moved out of MobileHeader). */}
          <ThemeToggle className="size-11 rounded-lg border-transparent bg-transparent shadow-none" />
          <SheetDescription className="sr-only">
            Workspaces without a tab, tools, and every H-Space page.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <nav aria-label="More destinations" className="space-y-0.5">
            {moreNavItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                variant="list"
                showDescription
                active={isNavigationItemActive({ pathname, searchParams, item })}
                onNavigate={close}
                trailing={chevron}
              />
            ))}
          </nav>

          <h2 className="mt-6 border-t border-border px-1 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            All pages
          </h2>
          {browseSections.map((section) => {
            const headingId = `more-${section.id}`
            return (
              <section key={section.id} aria-labelledby={headingId} className="pt-3">
                <h3 id={headingId} className="px-1 pb-1 text-xs font-semibold text-foreground">
                  {section.label}
                </h3>
                <nav aria-label={section.label} className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavRow
                      key={item.id}
                      item={item}
                      variant="list"
                      active={isNavigationItemActive({ pathname, searchParams, item })}
                      onNavigate={close}
                      trailing={chevron}
                    />
                  ))}
                </nav>
              </section>
            )
          })}

          {moreComingSoon.length > 0 && (
            <p className="px-1 pt-5 text-xs text-muted-foreground">
              Coming soon: {moreComingSoon.map((i) => i.label).join(" · ")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
