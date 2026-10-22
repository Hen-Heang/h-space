"use client"

import Image from "next/image"
import Link from "next/link"

import { NavIconRow } from "@/components/layout/NavItem"
import {
  isNavigationItemActive,
  primaryNavItems,
  todayItem,
  type NavSearchParams,
} from "@/lib/navigation"

import { ProfileMenu } from "./ProfileMenu"

export const RAIL_WIDTH = 80

/**
 * 768–1199px navigation. The hub's five destinations (Today, Goals, Korean,
 * Notes, Progress — `primaryNavItems`) as a flat icon column; no flyouts
 * needed with only five items. The mobile bottom bar is never used at these
 * widths.
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
      <div className="flex justify-center px-2 py-4">
        <Link
          href={todayItem.href}
          aria-label="H-Space home"
          className="flex size-11 items-center justify-center overflow-hidden rounded-lg outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/hengo-icon.png" alt="" width={44} height={44} className="size-full" />
        </Link>
      </div>

      <div className="mx-3 h-px bg-border" />

      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {primaryNavItems.map((item) => (
          <NavIconRow
            key={item.id}
            item={item}
            showLabel
            active={isNavigationItemActive({ pathname, searchParams, item })}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border px-2 py-3">
        <ProfileMenu collapsed side="right" />
      </div>
    </aside>
  )
}
