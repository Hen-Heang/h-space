"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowUpRight, ListPlus, MessageCircle, Plus, Search, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { readRecentNavIds } from "@/lib/last-visited"
import {
  aiCoachItem,
  linkPath,
  navSections,
  settingsItem,
  shippedItems,
  type NavItem,
} from "@/lib/navigation"
import { openQuickCapture } from "@/lib/quick-capture-bus"
import { cn } from "@/lib/utils"

const QUICK_CAPTURE_ACTION_KEY = "action-quick-capture"

type Entry = {
  key: string
  label: string
  hint: string
  icon: React.ElementType
  /** Tailwind text-color utility for the icon — see `NavItem.color`. */
  color?: string
  href: string
  /** Terms matched against the query, in addition to label + hint. */
  keywords: string
}

type Group = { id: string; label: string; entries: Entry[] }

// ─── Destinations ─────────────────────────────────────────────────────────────

function toEntry(item: NavItem, hint: string): Entry {
  return {
    key: item.id,
    label: item.label,
    hint,
    icon: item.icon,
    color: item.color,
    href: item.href,
    keywords: [item.label, hint, item.description ?? "", ...(item.keywords ?? [])]
      .join(" ")
      .toLowerCase(),
  }
}

// Settings belongs to no navSection — it has no sidebar row and no bottom
// tab, and is reached through the account menu plus a header gear icon that
// isn't on every surface. Building this list purely from navSections
// therefore left the one page every learner eventually needs as the one page
// they couldn't search for. Appended explicitly, since there is no section to
// fold it into.
const PAGE_ENTRIES: Entry[] = [
  ...navSections.flatMap((section) =>
    shippedItems(section.items).map((item) => toEntry(item, section.label)),
  ),
  toEntry(settingsItem, "Account"),
]

const ENTRY_BY_ID = new Map(PAGE_ENTRIES.map((entry) => [entry.key, entry]))

// The pre-typing browse view: the same shipped destinations as PAGE_ENTRIES,
// kept in their section groups so opening ⌘K shows what the app actually
// contains rather than five entries. Typing collapses these back into one
// flat, ranked "Pages" group — browsing wants structure, searching doesn't.
const BROWSE_GROUPS: { id: string; label: string; entries: Entry[] }[] = navSections
  .map((section) => ({
    id: `section-${section.id}`,
    label: section.label,
    // Each entry's own description is its subtitle here — repeating the
    // section label would just duplicate the group heading above it.
    entries: shippedItems(section.items).map((item) => toEntry(item, item.description ?? "")),
  }))
  .filter((group) => group.entries.length > 0)
  // …and it gets a group of its own in the browse view for the same reason:
  // no nav row means ⌘K is the only place it can be stumbled upon.
  .concat({
    id: "section-account",
    label: "Account",
    entries: [toEntry(settingsItem, "Profile, preferences & account")],
  })

// Global actions. `href` is a plain route — no mutations happen here, the
// destination page owns the actual creation flow. "Quick capture" is the one
// exception: it opens the shared QuickCaptureDialog directly (see
// lib/quick-capture-bus.ts) instead of navigating, so ⌘K stays the single
// safe entry point for capture without a second global keyboard listener.
const ACTION_ENTRIES: Entry[] = [
  {
    key: QUICK_CAPTURE_ACTION_KEY,
    label: "Quick capture",
    hint: "Jot down an idea, task, or phrase",
    icon: Zap,
    color: "text-amber-500",
    href: "",
    keywords: "quick capture inbox idea note task phrase journal dev second brain",
  },
  {
    key: "action-create-goal",
    label: "Create goal",
    hint: "New outcome to work toward",
    icon: Plus,
    color: "text-emerald-500",
    href: "/goals/create",
    keywords: "create goal new objective outcome add plan",
  },
  {
    key: "action-add-task",
    label: "Add task",
    hint: "Plan today's work",
    icon: ListPlus,
    color: "text-blue-500",
    href: "/goals/tasks",
    keywords: "add task todo new schedule plan today",
  },
  {
    key: "action-ask-ai",
    label: "Ask AI",
    hint: aiCoachItem.description ?? "",
    icon: MessageCircle,
    color: "text-teal-500",
    href: aiCoachItem.href,
    keywords: "ai ask coach chat assistant korean speaking help",
  },
]

// Default (empty-query) actions — only the one that matches V2's Korean-
// learning identity. "Quick capture" (Inbox), "Create goal", and "Add task"
// are V1 productivity actions: still typeable (searchable via ACTION_ENTRIES
// above), just not shown unprompted the moment ⌘K opens.
const DEFAULT_ACTION_ENTRIES: Entry[] = ACTION_ENTRIES.filter(
  (entry) => entry.key === "action-ask-ai",
)

function matches(entry: Entry, normalized: string): boolean {
  return entry.keywords.includes(normalized) || entry.label.toLowerCase().includes(normalized)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickSwitcher({
  compact = false,
  className,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
}: {
  compact?: boolean
  className?: string
  /** Render only the dialog — the caller supplies its own trigger. */
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const open = controlledOpen ?? uncontrolledOpen

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        setQuery("")
        setActiveIndex(0)
        // Read recents at open time only — never on every render.
        setRecentIds(readRecentNavIds())
      }
      if (onOpenChange) onOpenChange(next)
      else setUncontrolledOpen(next)
    },
    [onOpenChange],
  )

  const groups: Group[] = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filter = (entries: Entry[]) =>
      normalized ? entries.filter((entry) => matches(entry, normalized)) : entries

    // Recent destinations come from local last-visited data — no network,
    // no global goals/tasks query just to render a menu.
    const currentPath = linkPath(pathname)
    const recent = recentIds
      .map((id) => ENTRY_BY_ID.get(id))
      .filter((entry): entry is Entry => Boolean(entry) && linkPath(entry!.href) !== currentPath)
      .slice(0, 4)
    const recentKeys = new Set(recent.map((entry) => entry.key))

    const actions = normalized ? filter(ACTION_ENTRIES) : DEFAULT_ACTION_ENTRIES

    // Empty query: browse the whole catalog by section. Typing switches to one
    // flat ranked list — with 33 destinations, grouping a search result set
    // scatters the best match down the page.
    const pageGroups: Group[] = normalized
      ? [
          {
            id: "pages",
            label: "Pages",
            entries: filter(PAGE_ENTRIES).filter((entry) => !recentKeys.has(entry.key)),
          },
        ]
      : BROWSE_GROUPS.map((group) => ({
          ...group,
          entries: group.entries.filter(
            (entry) => !recentKeys.has(entry.key) && linkPath(entry.href) !== currentPath,
          ),
        }))

    const candidates: Group[] = [
      { id: "recent", label: "Recent", entries: filter(recent) },
      ...pageGroups,
      { id: "actions", label: "Actions", entries: actions },
    ]

    return candidates.filter((group) => group.entries.length > 0)
  }, [query, recentIds, pathname])

  // Flat order for keyboard navigation across group boundaries.
  const flat = useMemo(() => groups.flatMap((group) => group.entries), [groups])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const editing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(!open)
      } else if (!editing && event.key === "/") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [open, setOpen])

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  function visit(entry: Entry) {
    setOpen(false)
    if (entry.key === QUICK_CAPTURE_ACTION_KEY) {
      openQuickCapture()
      return
    }
    if (entry.href.startsWith("http")) {
      window.open(entry.href, "_blank", "noopener,noreferrer")
      return
    }
    router.push(entry.href)
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, flat.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === "Enter" && flat[activeIndex]) {
      event.preventDefault()
      visit(flat[activeIndex])
    }
  }

  let cursor = -1

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          onClick={() => setOpen(true)}
          className={cn(
            compact
              ? "size-11 rounded-lg"
              : "h-9 min-w-44 justify-start gap-2.5 rounded-lg px-3 text-muted-foreground shadow-none",
            className,
          )}
          aria-label="Open quick navigation"
        >
          <Search size={16} />
          {!compact && (
            <>
              <span className="flex-1 text-left">Jump to…</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
                ⌘K
              </kbd>
            </>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[min(42%,22rem)] max-w-xl gap-0 overflow-hidden rounded-2xl p-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Quick navigation</DialogTitle>
            <DialogDescription>Search pages and run common actions.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search size={18} aria-hidden className="shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pages and actions…"
              aria-label="Search destinations and actions"
              role="combobox"
              aria-expanded
              aria-controls="quick-switcher-results"
              className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:bg-transparent focus-visible:ring-0"
            />
            <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div
            ref={listRef}
            id="quick-switcher-results"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(60vh,26rem)] overflow-y-auto p-2"
          >
            {groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.id} className="pb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {group.label}
                  </p>
                  {group.entries.map((entry) => {
                    cursor += 1
                    const index = cursor
                    const active = index === activeIndex
                    const current = linkPath(entry.href) === linkPath(pathname)
                    const Icon = entry.icon
                    return (
                      <button
                        key={`${group.id}-${entry.key}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-active={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => visit(entry)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors",
                          active ? "bg-accent" : "hover:bg-accent/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border",
                            active && "border-primary/30 bg-primary/10",
                          )}
                        >
                          <Icon
                            size={17}
                            strokeWidth={2.2}
                            className={cn(entry.color, !active && "opacity-80")}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm font-medium",
                              current ? "text-primary" : "text-foreground",
                            )}
                          >
                            {entry.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {entry.hint}
                          </span>
                        </span>
                        <ArrowUpRight
                          size={15}
                          aria-hidden
                          className={cn(
                            "shrink-0 text-muted-foreground/50",
                            active && "text-primary",
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-foreground">No matching destination</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try “vocabulary”, “habit”, “statistics”, or “ask AI”.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ navigate · Enter open</span>
            <span>/ opens from anywhere</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Exposed for tests — the destination and action catalogues. */
export const __quickSwitcherEntries = { PAGE_ENTRIES, ACTION_ENTRIES }
