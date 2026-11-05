"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarRange, Moon, Sunrise } from "lucide-react"

import { cn } from "@/lib/utils"

// Unlike GrowthTabs (hidden on desktop, since the sidebar already lists
// Habits/Recovery as separate top-level items), Morning/Evening/Weekly are
// NOT separate nav entries — this is the only way to switch between them at
// any screen size, so it's always visible.
const REVIEW_LINKS = [
  { href: "/review/morning", label: "Morning", icon: Sunrise },
  { href: "/review/evening", label: "Evening", icon: Moon },
  { href: "/review/weekly", label: "Weekly", icon: CalendarRange },
]

export function ReviewTabs() {
  const pathname = usePathname()

  // The app's one tab style (WorkspaceTabs, GoalDetailNav): underline on the
  // current page, one divider under the row, and wrapping instead of running
  // off (or scrolling sideways on) a narrow screen. It used to be a boxed blue segmented control
  // whose three flex-1 links couldn't shrink below their content at 320px.
  return (
    <nav aria-label="Review" className="mb-4 min-w-0 shadow-[inset_0_-1px_0_var(--border)]">
      <ul className="flex flex-wrap gap-x-1">
        {REVIEW_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-t-md border-b-2 px-2 text-sm font-medium sm:px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={16} aria-hidden="true" className="shrink-0" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
