"use client"

import Image from "next/image"
import Link from "next/link"

import { NavIconRow } from "@/components/layout/NavItem"
import {
  isNavigationItemActive,
  todayItem,
  toolNavItems,
  workspaceNavItems,
  type NavSearchParams,
} from "@/lib/navigation"

import { ProfileMenu } from "./ProfileMenu"

export const RAIL_WIDTH = 76

/**
 * 768–1199px navigation: the same workspaces and tools as the desktop
 * sidebar (`workspaceNavItems` / `toolNavItems`) as a labelled icon column.
 * Each workspace's own pages are its local tabs, so the rail needs no
 * overflow sheet. The mobile bottom bar is never used at these widths.
 */
export function TabletNavigationRail({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  return (
    <aside
      aria-label="Main navigation"
      style={{ width: RAIL_WIDTH }}
      className="sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-sidebar"
    >
      <div className="flex h-14 shrink-0 items-center justify-center px-2">
        <Link
          href={todayItem.href}
          aria-label="H-Space home"
          className="flex size-9 items-center justify-center overflow-hidden rounded-md outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/hengo-icon.png" alt="" width={36} height={36} className="size-full" />
        </Link>
      </div>

      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <h2 className="sr-only">Workspace</h2>
        <ul className="space-y-0.5">
          {workspaceNavItems.map((item) => (
            <li key={item.id}>
              <NavIconRow
                item={item}
                showLabel
                active={isNavigationItemActive({ pathname, searchParams, item })}
              />
            </li>
          ))}
        </ul>
        <div className="mx-2 my-3 h-px bg-border" />
        <h2 className="sr-only">Tools</h2>
        <ul className="space-y-0.5">
          {toolNavItems.map((item) => (
            <li key={item.id}>
              <NavIconRow
                item={item}
                showLabel
                active={isNavigationItemActive({ pathname, searchParams, item })}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-2 py-3">
        <ProfileMenu collapsed side="right" />
      </div>
    </aside>
  )
}
