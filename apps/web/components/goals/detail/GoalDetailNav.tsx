"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export interface GoalNavItem {
  href: string
  label: string
  /** Badge count, e.g. the open task count on Tasks. */
  count?: number
}

/**
 * The goal's five routes. Real links, not tab triggers — so the back button,
 * middle-click and a pasted URL all behave. Styled like `WorkspaceTabs`
 * (underline on the current tab, one divider under the row, wrapping rather
 * than scrolling on narrow screens) so the app has one tab language, not a
 * second pill bar.
 */
export function GoalDetailNav({ items }: { items: GoalNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Goal sections" className="min-w-0 shadow-[inset_0_-1px_0_var(--border)]">
      <ul className="flex flex-wrap gap-x-1">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-2 text-sm font-medium sm:px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {item.count != null && item.count > 0 && (
                  <span className="tabular-nums text-muted-foreground">
                    {item.count}
                    <span className="sr-only"> open</span>
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
