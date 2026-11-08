"use client"

import { BookOpenText, Languages, MessagesSquare } from "lucide-react"

import { cn } from "@/lib/utils"

export type StudyMode = "phrases" | "reading" | "foundations"

const TABS: { id: StudyMode; label: string; icon: typeof MessagesSquare }[] = [
  { id: "phrases", label: "Phrases", icon: MessagesSquare },
  { id: "reading", label: "Reading", icon: BookOpenText },
  { id: "foundations", label: "Foundations", icon: Languages },
]

/**
 * Local mode switcher for the merged Phrasebook/Reading hub (one route,
 * `?mode=` query param) — same reasoning as GoalsHubNav's tab bar, but real
 * buttons instead of links since both modes live on a single page/route.
 */
export function StudyModeTabs({
  mode,
  onChange,
}: {
  mode: StudyMode
  onChange: (mode: StudyMode) => void
}) {
  return (
    <nav aria-label="Study sections" className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <ul className="inline-flex min-w-full gap-1 rounded-lg bg-foreground/5 p-1">
        {TABS.map((tab) => {
          const active = mode === tab.id
          const Icon = tab.icon
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors active:scale-[0.99]",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
