"use client"

import { useState } from "react"
import Link from "next/link"

import { MoreSheet } from "@/components/layout/MoreSheet"
import {
  isMoreRoute,
  isNavigationItemActive,
  mobileNavItems,
  moreIcon as MoreIcon,
  type NavSearchParams,
} from "@/lib/navigation"
import { cn } from "@/lib/utils"

const TAB =
  "relative z-10 flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 outline-none transition-[color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-95 motion-reduce:active:scale-100"

function TabLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        // text-xs is the 13px floor (globals.css); five tabs still fit at 320px.
        "w-full truncate px-0.5 text-center text-xs leading-none",
        active ? "font-semibold" : "font-medium",
      )}
    >
      {children}
    </span>
  )
}

/**
 * Mobile bottom bar: Home · Plan · Learn · Apps (`mobileNavItems`) plus a
 * "More" trigger that opens `MoreSheet` (Notes, Growth, Settings, and
 * every page by workspace). More reads as current on any route
 * none of the four tabs owns.
 *
 * The bar is a floating glass capsule (translucent fill, heavy blur, a
 * hairline highlight rim) with a "lens" that slides behind the current tab.
 * With `prefers-reduced-transparency` the globals.css `mobile-glass`
 * rule swaps the glass for the opaque background; with reduced motion the
 * lens jumps instead of sliding. Its height is mirrored in AppShell's
 * `--shell-bottom-nav-h`.
 *
 * When the soft keyboard is open the whole element is unmounted by `AppShell`
 * rather than hidden, so nothing inside stays in the tab order.
 */
export function MobileBottomNav({
  pathname,
  searchParams,
}: {
  pathname: string
  searchParams: NavSearchParams
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = isMoreRoute(pathname, searchParams)
  const activeIndex = moreActive
    ? mobileNavItems.length
    : mobileNavItems.findIndex((item) => isNavigationItemActive({ pathname, searchParams, item }))
  const tabCount = mobileNavItems.length + 1

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <ul
        className={cn(
          "mobile-glass pointer-events-auto relative mx-auto flex max-w-lg items-stretch rounded-full p-1",
          // Glass: a thin tinted fill, heavy blur + saturation for the
          // refracted look, a light rim and a soft floating shadow.
          "border border-white/60 bg-background/60 backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_8px_32px_-6px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.55)]",
          "dark:border-white/10 dark:bg-background/55 dark:shadow-[0_8px_32px_-6px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.08)]",
        )}
      >
        {activeIndex >= 0 && (
          <li
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1 rounded-full",
              "bg-foreground/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_1px_3px_rgb(0_0_0/0.08)]",
              "dark:bg-white/[0.12] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
              "transition-transform duration-500 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none",
            )}
            style={{
              width: `calc((100% - 0.5rem) / ${tabCount})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        {mobileNavItems.map((item) => {
          const active = isNavigationItemActive({ pathname, searchParams, item })
          const Icon = item.icon
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 2} aria-hidden className="shrink-0" />
                <TabLabel active={active}>{item.shortLabel ?? item.label}</TabLabel>
              </Link>
            </li>
          )
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            className={cn(TAB, moreActive ? "text-primary" : "text-muted-foreground")}
          >
            <MoreIcon
              size={20}
              strokeWidth={moreActive ? 2.3 : 2}
              aria-hidden
              className="shrink-0"
            />
            <TabLabel active={moreActive}>More</TabLabel>
          </button>
        </li>
      </ul>
      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        pathname={pathname}
        searchParams={searchParams}
      />
    </nav>
  )
}
