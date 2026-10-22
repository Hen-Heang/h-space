"use client"

import { ChevronRight } from "lucide-react"

import { NavRow } from "@/components/layout/NavItem"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  isNavigationItemActive,
  moreComingSoon,
  settingsItem,
  sidebarSections,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

/**
 * "Spaces" — the mobile bottom bar's and tablet rail's view of every
 * workspace. Renders `sidebarSections`, the same data as the desktop sidebar,
 * so every shipped route has a tappable front door on every screen size; the
 * four primary tabs are deliberately repeated here so each workspace reads
 * complete. Settings closes the list; Coming Soon features get one muted line
 * rather than dead rows.
 */
export function SpacesSheet({
  open,
  onOpenChange,
  pathname,
  searchParams,
  side = "bottom",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  searchParams: NavSearchParams
  side?: "bottom" | "left"
}) {
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "gap-0",
          side === "bottom"
            ? "max-h-[85dvh] rounded-t-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "pt-[env(safe-area-inset-top)]",
        )}
      >
        <SheetHeader className="pb-1">
          <SheetTitle>Spaces</SheetTitle>
          <SheetDescription className="sr-only">
            Every H-Space workspace and its pages.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {sidebarSections.map((section) => {
            const headingId = `spaces-${section.id}`
            return (
              <section key={section.id} aria-labelledby={headingId} className="pt-3 first:pt-0">
                <h3
                  id={headingId}
                  className="px-1 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
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
                      trailing={
                        <ChevronRight size={16} aria-hidden className="shrink-0 opacity-40" />
                      }
                    />
                  ))}
                </nav>
              </section>
            )
          })}

          <nav aria-label="Account" className="mt-4 border-t border-border pt-3">
            <NavRow
              item={settingsItem}
              variant="list"
              active={isNavigationItemActive({ pathname, searchParams, item: settingsItem })}
              onNavigate={close}
              trailing={<ChevronRight size={16} aria-hidden className="shrink-0 opacity-40" />}
            />
          </nav>

          {moreComingSoon.length > 0 && (
            <p className="px-1 pt-5 text-xs text-muted-foreground/70">
              Coming soon: {moreComingSoon.map((i) => i.label).join(" · ")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
