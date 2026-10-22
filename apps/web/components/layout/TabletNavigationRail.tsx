"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

import { ActiveIndicator, NavIconRow } from "@/components/layout/NavItem"
import { SpacesSheet } from "@/components/layout/SpacesSheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  isNavigationItemActive,
  isSpacesRoute,
  primaryNavItems,
  todayItem,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

import { ProfileMenu } from "./ProfileMenu"

export const RAIL_WIDTH = 80

/**
 * 768–1199px navigation. The same four workspace tabs as the mobile bottom
 * bar (Today, Goals, Learning, Notes — `primaryNavItems`) as a flat icon
 * column, plus a "Spaces" trigger that opens every workspace in a left sheet.
 * The mobile bottom bar is never used at these widths.
 */
export function TabletNavigationRail({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  const [spacesOpen, setSpacesOpen] = useState(false)
  const spacesActive = isSpacesRoute(pathname, searchParams)

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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setSpacesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={spacesOpen}
              className={cn(
                "relative flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                spacesActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {spacesActive && <ActiveIndicator />}
              <LayoutGrid
                size={20}
                strokeWidth={spacesActive ? 2.4 : 2}
                aria-hidden
                className={cn("shrink-0", !spacesActive && "opacity-70")}
              />
              <span
                className={cn(
                  "max-w-full truncate px-1 text-xs leading-none",
                  spacesActive && "font-semibold",
                )}
              >
                Spaces
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">All workspaces</TooltipContent>
        </Tooltip>
      </nav>

      <div className="space-y-1 border-t border-border px-2 py-3">
        <ProfileMenu collapsed side="right" />
      </div>

      <SpacesSheet
        open={spacesOpen}
        onOpenChange={setSpacesOpen}
        pathname={pathname}
        searchParams={searchParams}
        side="left"
      />
    </aside>
  )
}
