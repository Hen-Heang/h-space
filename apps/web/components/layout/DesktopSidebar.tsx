"use client"

import Image from "next/image"
import Link from "next/link"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { NavIconRow, NavRow } from "@/components/layout/NavItem"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  isNavigationItemActive,
  sidebarSections,
  todayItem,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

import { ProfileMenu } from "./ProfileMenu"

export const SIDEBAR_EXPANDED_WIDTH = 232
export const SIDEBAR_COLLAPSED_WIDTH = 72

/**
 * Every shipped destination, grouped by section — `sidebarSections` from
 * `lib/navigation.ts`, in registry order. Expanded it's a labelled 232px rail
 * with section headings; collapsed it's a 72px icon column with the groups
 * separated by rules and the headings kept for screen readers.
 *
 * This replaced V2's five-item rail (Today · Vocabulary · Practice · Coach ·
 * Study, still exported as `primaryNavItems` and still what the tablet rail
 * and mobile bottom bar render). V2 hid ~28 built, working routes behind
 * Quick Switcher search; they now have rows you can click. `soon`
 * placeholders are excluded — see `sidebarSections`.
 *
 * The shell decides at which widths this renders at all (`useNavigationMode`
 * in AppShell) — there are deliberately no responsive classes here.
 */
export function DesktopSidebar({
  pathname,
  searchParams,
  collapsed,
  onToggleCollapsed,
}: {
  pathname: string
  searchParams: NavSearchParams
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  return (
    <aside
      aria-label="Main navigation"
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
      className="sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-sidebar"
    >
      {/* Brand + collapse toggle. Branding lives here only — never also in the
          top bar. */}
      <div className={cn("flex items-center gap-2 px-3 py-4", collapsed && "flex-col gap-3")}>
        <Link
          href={todayItem.href}
          aria-label="H-Space home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border">
            <Image src="/hengo-icon.png" alt="" width={36} height={36} className="size-full" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">
                H-Space
              </span>
              <span className="block truncate text-xs leading-tight text-muted-foreground">
                My Projects. One Space.
              </span>
            </span>
          )}
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-3 h-px bg-border" />

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-3">
        {sidebarSections.map((section, index) => {
          // A section whose only item repeats its own name (Today) would read
          // as a heading stacked on an identical row — give it the heading for
          // screen readers and nothing visible.
          const headingIsRedundant =
            section.items.length === 1 && section.items[0].label === section.label
          const headingId = `sidebar-section-${section.id}`

          return (
            <section
              key={section.id}
              aria-labelledby={headingId}
              className={index > 0 ? "mt-4" : undefined}
            >
              {/* Collapsed to icons there's no room for a heading, so the
                  groups are separated by a rule instead and the label stays
                  available to assistive tech. */}
              {collapsed || headingIsRedundant ? (
                <>
                  {collapsed && index > 0 && <div className="mx-2 mb-3 h-px bg-border" />}
                  <h2 id={headingId} className="sr-only">
                    {section.label}
                  </h2>
                </>
              ) : (
                <h2
                  id={headingId}
                  className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                >
                  {section.label}
                </h2>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isNavigationItemActive({ pathname, searchParams, item })
                  return collapsed ? (
                    <NavIconRow key={item.id} item={item} active={active} />
                  ) : (
                    <NavRow key={item.id} item={item} active={active} />
                  )
                })}
              </div>
            </section>
          )
        })}
      </nav>

      {/* Account */}
      <div className="space-y-1 border-t border-border px-3 py-3">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </aside>
  )
}
