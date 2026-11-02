"use client"

import { useMemo, useState } from "react"
import { ArrowDownUp, LayoutGrid, Layers3, List, Plus, SearchX } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { VocabDeck } from "@/components/vocab/VocabDeck"
import {
  computeVocabStats,
  filterVocab,
  matchesMastery,
  sortVocab,
  type MasteryFilter,
  type SortOrder,
} from "@/lib/vocab-review"
import type { VocabItem } from "@/lib/types"

export type VocabViewMode = "list" | "grid"
type BookFilter = "all" | "beginner-book" | "intermediate-book" | "core-300"
type LevelFilter = "all" | "beginner" | "intermediate"
type PriorityFilter = "all" | "p1" | "p2"
type PosFilter = "all" | "verb" | "noun" | "adjective" | "adverb" | "other"

type VocabDictionaryProps = {
  words: VocabItem[]
  loading: boolean
  // Driven by the page-level search bar at the top of /vocab — the dictionary
  // has no search input of its own.
  query: string
  onUpdate: (
    id: string,
    data: { term: string; meaning: string; example?: string; pronunciation?: string },
  ) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  /** Enables the per-deck inline "add word" form; the deck supplies its category. */
  onAdd?: (data: {
    category?: string
    term: string
    meaning: string
    example?: string
  }) => Promise<unknown>
  /** Enables each deck's "Review this deck" button, which launches Memory Lab scoped to it. */
  onReviewDeck?: (category: string) => void
  /** Opens the Add Words dialog — shown as the CTA in the empty state. */
  onStartAdd?: () => void
  /** Clears the page-owned search input from the no-results state. */
  onClearSearch?: () => void
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const

function groupByCategory(words: VocabItem[]) {
  const groups = words.reduce<Record<string, VocabItem[]>>((acc, word) => {
    ;(acc[word.category] ??= []).push(word)
    return acc
  }, {})
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
}

function hasTag(word: VocabItem, tag: string) {
  return word.tags?.includes(tag) ?? false
}

function matchesMetadata(
  word: VocabItem,
  book: BookFilter,
  level: LevelFilter,
  priority: PriorityFilter,
  pos: PosFilter,
) {
  if (book === "beginner-book" && !hasTag(word, "source:2000-essential-beginner")) return false
  if (book === "intermediate-book" && !hasTag(word, "source:2000-essential-intermediate"))
    return false
  if (book === "core-300" && !hasTag(word, "core:300")) return false

  if (level === "beginner" && !hasTag(word, "level:beginner")) return false
  if (level === "intermediate" && !hasTag(word, "level:intermediate")) return false

  if (priority === "p1" && !hasTag(word, "priority:p1")) return false
  if (priority === "p2" && !hasTag(word, "priority:p2")) return false

  if (pos !== "all") {
    const mainPos = ["verb", "noun", "adjective", "adverb"] as const
    if (pos === "other") {
      if (mainPos.some((item) => hasTag(word, `pos:${item}`))) return false
      if (!(word.tags ?? []).some((tag) => tag.startsWith("pos:"))) return false
    } else if (!hasTag(word, `pos:${pos}`)) {
      return false
    }
  }

  return true
}

function DeckSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40"
        >
          {/* top mastery bar */}
          <Skeleton className="absolute inset-x-0 top-0 h-1 rounded-none" />
          <div className="flex items-start justify-between gap-4 pt-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-7 w-12 rounded-2xl" />
          </div>
          <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
          <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

const MASTERY_FILTERS: { value: MasteryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "weak", label: "Weak" },
  { value: "learning", label: "Learning" },
  { value: "mastered", label: "Mastered" },
]

const BOOK_FILTERS: { value: BookFilter; label: string }[] = [
  { value: "all", label: "All books" },
  { value: "beginner-book", label: "2000 Essential · Beginner" },
  { value: "intermediate-book", label: "2000 Essential · Intermediate" },
  { value: "core-300", label: "Core Korean 300" },
]

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
]

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "p1", label: "P1 · Must know" },
  { value: "p2", label: "P2 · Next layer" },
]

const POS_FILTERS: { value: PosFilter; label: string }[] = [
  { value: "all", label: "All parts of speech" },
  { value: "verb", label: "Verb" },
  { value: "noun", label: "Noun" },
  { value: "adjective", label: "Adjective" },
  { value: "adverb", label: "Adverb" },
  { value: "other", label: "Other POS" },
]

const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: "alpha", label: "A → Z" },
  { value: "mastery-asc", label: "Weakest first" },
  { value: "mastery-desc", label: "Strongest first" },
  { value: "due", label: "Due soonest" },
]

export function VocabDictionary({
  words,
  loading,
  query,
  onUpdate,
  onDelete,
  onAdd,
  onReviewDeck,
  onStartAdd,
  onClearSearch,
}: VocabDictionaryProps) {
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all")
  const [bookFilter, setBookFilter] = useState<BookFilter>("all")
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [posFilter, setPosFilter] = useState<PosFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("alpha")
  const [viewMode, setViewMode] = useState<VocabViewMode>("list")

  const metadataFiltered = useMemo(
    () =>
      words.filter((word) =>
        matchesMetadata(word, bookFilter, levelFilter, priorityFilter, posFilter),
      ),
    [words, bookFilter, levelFilter, priorityFilter, posFilter],
  )

  const filtered = useMemo(
    () => sortVocab(filterVocab(metadataFiltered, query, masteryFilter), sortOrder),
    [metadataFiltered, query, masteryFilter, sortOrder],
  )
  const decks = useMemo(() => groupByCategory(filtered), [filtered])

  const isFiltering =
    query.trim().length > 0 ||
    masteryFilter !== "all" ||
    bookFilter !== "all" ||
    levelFilter !== "all" ||
    priorityFilter !== "all" ||
    posFilter !== "all"

  // Counts respect book/level/priority/POS/search filters, but ignore the selected
  // progress bucket so learners can see how many cards are available in each state.
  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        MASTERY_FILTERS.map(({ value }) => [
          value,
          filterVocab(metadataFiltered, query, value).filter((word) =>
            value === "all" ? true : matchesMastery(word.mastery, value),
          ).length,
        ]),
      ) as Record<MasteryFilter, number>,
    [metadataFiltered, query],
  )

  function clearFilters() {
    setMasteryFilter("all")
    setBookFilter("all")
    setLevelFilter("all")
    setPriorityFilter("all")
    setPosFilter("all")
    onClearSearch?.()
  }

  // Collection health as one line in the library header (the mastery filter
  // chips below carry the per-bucket counts). The due count lives on the
  // Memory Lab card above, so it isn't repeated here.
  const stats = useMemo(() => computeVocabStats(words), [words])

  return (
    <div id="vocab-dictionary" className="scroll-mt-20 space-y-5">
      {words.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm dark:bg-slate-900/50">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Browse decks</h3>
              <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
                {isFiltering
                  ? `Showing ${filtered.length} of ${words.length} words`
                  : `${words.length.toLocaleString()} words across ${decks.length} decks`}
              </p>
              {!isFiltering && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.mastered.toLocaleString()} mastered · {stats.averageMastery}% average
                  strength
                </p>
              )}
            </div>
            {isFiltering ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="space-y-4 p-3 sm:p-4" role="group" aria-label="Vocabulary view controls">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Book · level · priority · part of speech
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Select
                  value={bookFilter}
                  onValueChange={(value) => setBookFilter(value as BookFilter)}
                >
                  <SelectTrigger
                    aria-label="Filter vocabulary by book"
                    className="h-10 min-w-0 rounded-xl bg-background shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOK_FILTERS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={levelFilter}
                  onValueChange={(value) => setLevelFilter(value as LevelFilter)}
                >
                  <SelectTrigger
                    aria-label="Filter vocabulary by level"
                    className="h-10 min-w-0 rounded-xl bg-background shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_FILTERS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}
                >
                  <SelectTrigger
                    aria-label="Filter vocabulary by priority"
                    className="h-10 min-w-0 rounded-xl bg-background shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_FILTERS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={posFilter}
                  onValueChange={(value) => setPosFilter(value as PosFilter)}
                >
                  <SelectTrigger
                    aria-label="Filter vocabulary by part of speech"
                    className="h-10 min-w-0 rounded-xl bg-background shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POS_FILTERS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Progress
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {MASTERY_FILTERS.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    onClick={() => setMasteryFilter(value)}
                    variant={masteryFilter === value ? "secondary" : "outline"}
                    size="sm"
                    aria-pressed={masteryFilter === value}
                    className={cn(
                      "shrink-0 rounded-xl px-3 text-xs",
                      masteryFilter === value
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                    <span className="font-mono text-[10px] opacity-65">{filterCounts[value]}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border/50 pt-3">
              <div className="min-w-0 flex-1 sm:max-w-56">
                <Select
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as SortOrder)}
                >
                  <SelectTrigger
                    aria-label="Sort vocabulary words"
                    className="h-10 w-full rounded-xl bg-background shadow-none"
                  >
                    <ArrowDownUp className="text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_ORDERS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background p-1"
                role="group"
                aria-label="Deck layout"
              >
                <Button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  variant="ghost"
                  size="icon-lg"
                  className={cn(
                    "rounded-lg",
                    viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <List size={14} strokeWidth={2.5} />
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  variant="ghost"
                  size="icon-lg"
                  className={cn(
                    "rounded-lg",
                    viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid size={14} strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && !words.length ? <DeckSkeleton /> : null}

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3"
            : "space-y-3",
        )}
      >
        {decks.map(([category, items], index) => (
          <motion.div
            key={category}
            variants={itemVariants}
            // An opened deck needs the full row to fit its word list, so it
            // breaks out of the grid via the data-open flag VocabDeck sets.
            className={cn(viewMode === "grid" && "has-[[data-open=true]]:col-span-full")}
          >
            <VocabDeck
              name={category}
              items={items}
              defaultOpen={index === 0}
              forceOpen={isFiltering}
              viewMode={viewMode}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAdd={onAdd}
              onReviewDeck={onReviewDeck}
            />
          </motion.div>
        ))}
      </div>

      {!loading && words.length > 0 && !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-accent/5 p-10 text-center">
          <SearchX size={32} strokeWidth={1.5} className="mb-4 text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-foreground">No matching words</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Try a different book, level, priority, part of speech, spelling, or progress filter.
          </p>
          <Button type="button" variant="outline" onClick={clearFilters} className="mt-4">
            Reset search and filters
          </Button>
        </div>
      ) : null}

      {!loading && !words.length ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-accent/5 p-10 text-center sm:rounded-3xl sm:p-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/10 text-muted-foreground/60">
            <Layers3 size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-foreground">Start Your Collection</h3>
          <p className="mx-auto mt-3 max-w-xs text-[16px] font-medium leading-relaxed text-muted-foreground">
            Save words from chat sessions or use the AI Deck Builder to start mastering Korean
            vocabulary.
          </p>
          {onStartAdd && (
            <Button type="button" onClick={onStartAdd} size="lg" className="mt-6">
              <Plus size={18} strokeWidth={2.5} />
              Add your first words
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
