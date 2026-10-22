"use client"

import Link from "next/link"

import { isNavigationItemActive, primaryNavItems, type NavSearchParams } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const TAB =
  "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

/**
 * The hub's five mobile destinations, filling the bar exactly — Today, Goals,
 * Korean, Notes, Progress (`primaryNavItems`), one per module. No "More"
 * trigger: everything else the app still supports (Vocabulary, Practice,
 * Habits, Recovery, Settings, general AI chat, …) stays a real, registered
 * route reachable from those hubs, by direct URL, and — for Settings — the
 * mobile header's action row; it simply has no tab here. Hengo Coach's own floating
 * launcher (`components/chat/FloatingAiCoach`) still gives one-tap access to
 * the general assistant without needing a slot in this bar.
 *
 * A stable elevated bottom surface — one border, one shadow, no glass
 * container, no sliding pill, no per-icon scaling.
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
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch gap-0.5 px-2 py-1.5">
        {primaryNavItems.map((item) => {
          const active = isNavigationItemActive({ pathname, searchParams, item })
          const Icon = item.icon
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                  className={cn("shrink-0", item.color, !active && "opacity-70")}
                />
                <span
                  className={cn(
                    "w-full truncate px-0.5 text-center text-xs leading-none",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
