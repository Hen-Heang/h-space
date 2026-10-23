"use client"

import Image from "next/image"
import Link from "next/link"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { NavIconRow, NavRow } from "@/components/layout/NavItem"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  isNavigationItemActive,
  todayItem,
  toolNavItems,
  workspaceNavItems,
  type NavItem,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

import { ProfileMenu } from "./ProfileMenu"

export const SIDEBAR_EXPANDED_WIDTH = 240
export const SIDEBAR_COLLAPSED_WIDTH = 68

const GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  { id: "workspace", label: "Workspace", items: workspaceNavItems },
  { id: "tools", label: "Tools", items: toolNavItems },
]

/**
 * The global sidebar: six workspaces plus the AI Assistant and Settings —
 * `workspaceNavItems` / `toolNavItems` from `lib/navigation.ts`, nothing
 * else. A workspace's own pages (Planner's Tasks/Goals/Calendar, …) are its
 * local tabs, never extra rows here.
 *
 * Expanded it's a labelled 240px column with group headings; collapsed it's a
 * 68px icon column with tooltips, the headings kept for screen readers. The
 * shell decides at which widths this renders at all (`useNavigationMode` in
 * AppShell) — there are deliberately no responsive classes here.
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
      className="sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out"
    >
      {/* Brand + collapse toggle. Branding lives here only — never also in the
          top bar. */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 px-3",
          collapsed && "h-auto flex-col gap-2 py-3",
        )}
      >
        <Link
          href={todayItem.href}
          aria-label="H-Space home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-border">
            <Image src="/hengo-icon.png" alt="" width={32} height={32} className="size-full" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-foreground">
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
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {GROUPS.map((group, index) => {
          const headingId = `sidebar-group-${group.id}`
          return (
            <section
              key={group.id}
              aria-labelledby={headingId}
              className={index > 0 ? "mt-5" : undefined}
            >
              {collapsed ? (
                <>
                  {index > 0 && <div className="mx-2 mb-3 h-px bg-border" />}
                  <h2 id={headingId} className="sr-only">
                    {group.label}
                  </h2>
                </>
              ) : (
                <h2
                  id={headingId}
                  className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {group.label}
                </h2>
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavigationItemActive({ pathname, searchParams, item })
                  return (
                    <li key={item.id}>
                      {collapsed ? (
                        <NavIconRow item={item} active={active} />
                      ) : (
                        <NavRow item={item} active={active} />
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </nav>

      {/* Profile */}
      <div className="border-t border-border px-3 py-3">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </aside>
  )
}
