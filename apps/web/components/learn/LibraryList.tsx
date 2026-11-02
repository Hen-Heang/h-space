import Link from "next/link"
import { CalendarDays, ChevronRight } from "lucide-react"

import { navSections, workspaceTabs, type NavItem } from "@/lib/navigation"

// The rest of the Learning workspace — routes that are neither a Learning tab
// nor the hub itself (Foundations, Reading, Scenarios, Exam Prep, History).
// Derived from the registry so a new Learning route shows up here without a
// second list to maintain. The weekday study plan (/practice/today) isn't a
// registry entry, so it's appended by hand.
const tabIds = new Set((workspaceTabs.learn ?? []).map((tab) => tab.id))

const weekdayPlan: NavItem = {
  id: "learn-weekday-plan",
  href: "/practice/today",
  label: "Weekday study plan",
  icon: CalendarDays,
  description: "A topic for each weekday, with a timed schedule",
}

const libraryItems: NavItem[] = [
  ...(navSections.find((s) => s.id === "learn")?.items ?? []).filter(
    (item) => !item.soon && !tabIds.has(item.id),
  ),
  weekdayPlan,
]

export function LibraryList() {
  return (
    <section aria-labelledby="library-heading" className="space-y-3">
      <h2 id="library-heading" className="text-sm font-semibold text-foreground">
        Library
      </h2>
      <ul className="app-surface divide-y divide-border overflow-hidden sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
        {libraryItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex min-h-14 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  {item.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
