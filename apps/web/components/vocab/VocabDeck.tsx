"use client"

import { useId, useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { BrainCircuit, ChevronDown, FolderOpen, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api"
import { computeVocabStats } from "@/lib/vocab-review"
import type { VocabItem } from "@/lib/types"
import { VocabCard } from "@/components/vocab/VocabCard"
import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/ui/SpeakButton"
import type { VocabViewMode } from "@/components/vocab/VocabDictionary"

type VocabDeckProps = {
  name: string
  items: VocabItem[]
  defaultOpen?: boolean
  /** Keeps the deck expanded regardless of its toggle state (e.g. while searching). */
  forceOpen?: boolean
  viewMode?: VocabViewMode
  onUpdate?: (
    id: string,
    data: { term: string; meaning: string; example?: string; pronunciation?: string },
  ) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  /** When provided, the open deck offers an inline form that saves into this category. */
  onAdd?: (data: {
    category?: string
    term: string
    meaning: string
    example?: string
  }) => Promise<unknown>
  /** When provided, the open deck offers a button that launches Memory Lab scoped to this category. */
  onReviewDeck?: (category: string) => void
}

function DeckAddForm({
  category,
  onAdd,
}: {
  category: string
  onAdd: NonNullable<VocabDeckProps["onAdd"]>
}) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState("")
  const [meaning, setMeaning] = useState("")
  const [example, setExample] = useState("")
  const [saving, setSaving] = useState(false)

  const canSave = term.trim() && meaning.trim() && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onAdd({
        category,
        term: term.trim(),
        meaning: meaning.trim(),
        example: example.trim() || undefined,
      })
      toast.success("Word added", { description: `Saved to “${category}”.` })
      // Keep the form open so several words can be added in a row.
      setTerm("")
      setMeaning("")
      setExample("")
    } catch (e) {
      toast.error("Could not add word", { description: getApiErrorMessage(e, "Please try again.") })
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 border-t border-border/60 px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent/5 hover:text-foreground"
      >
        <Plus size={14} strokeWidth={3} />
        Add word to this deck
      </button>
    )
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"

  return (
    <div className="space-y-2 border-t border-border/60 bg-accent/[0.03] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
          New word in “{category}”
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close add form"
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-accent/50 hover:text-foreground"
        >
          <X size={14} strokeWidth={3} />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term (한국어) *"
          className={inputClass}
          lang="ko"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="Meaning (English) *"
          className={inputClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Example sentence (optional)"
          className={cn(inputClass, "sm:col-span-2")}
          lang="ko"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
      >
        <Plus aria-hidden="true" size={16} strokeWidth={3} />
        {saving ? "Saving…" : "Add word"}
      </button>
    </div>
  )
}

function masteryColor(mastery: number) {
  if (mastery >= 80) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (mastery >= 50) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  return "bg-red-500/10 text-red-500 dark:text-red-400"
}

export function VocabDeck({
  name,
  items,
  defaultOpen = false,
  forceOpen = false,
  viewMode = "list",
  onUpdate,
  onDelete,
  onAdd,
  onReviewDeck,
}: VocabDeckProps) {
  const contentId = useId()
  const [open, setOpen] = useState(defaultOpen)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Snapshot of "now" for due-date checks — taken once on mount so render stays
  // pure; due counts refresh with the next data change/navigation, which is fine.
  const [now] = useState(() => new Date())
  const isOpen = open || forceOpen

  // Same aggregation the page hero and the Deck health panel run, scoped to
  // this deck — so a deck's "N due" badge and the page's "Due now" are the
  // same question asked of the same predicate, not two hand-rolled loops.
  // (The old inline version parsed nextReview with `new Date(...)`, which
  // reads a malformed value as NaN and therefore never due, where isDue's
  // string compare would call it due.)
  const { averageMastery: avgMastery, due: dueCount } = useMemo(
    () => computeVocabStats(items, now),
    [items, now],
  )
  // A taste of what's inside, so closed grid cards aren't just a name + number.
  const preview = items
    .slice(0, 3)
    .map((w) => w.term)
    .join(" · ")

  return (
    <div
      data-open={isOpen}
      className="h-full overflow-hidden rounded-[1.8rem] border border-border bg-card shadow-sm dark:bg-slate-900/40"
    >
      {/* Deck header — compact vertical card when the deck sits in the grid, full row otherwise */}
      {viewMode === "grid" && !isOpen ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex h-full w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <FolderOpen size={18} strokeWidth={2.5} />
            </div>
            {dueCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {dueCount} due
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">{name}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {items.length} {items.length === 1 ? "word" : "words"}
            </p>
          </div>
          {preview && (
            <p
              className="line-clamp-1 w-full break-all text-xs font-medium text-muted-foreground"
              lang="ko"
            >
              {preview}
            </p>
          )}
          <div className="mt-auto w-full">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wide text-muted-foreground">Mastery</span>
              <span className="tabular-nums text-teal-600">{avgMastery}%</span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent/20"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${avgMastery}%` }}
              />
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40 sm:px-6"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
            <FolderOpen size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">{name}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {items.length} {items.length === 1 ? "word" : "words"} · {avgMastery}% mastered
            </p>
          </div>
          {dueCount > 0 && (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {dueCount} due
            </span>
          )}
          <div
            className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-accent/20 sm:block sm:w-24"
            aria-hidden="true"
          >
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${avgMastery}%` }} />
          </div>
          <ChevronDown
            size={18}
            strokeWidth={2.5}
            className={cn(
              "shrink-0 text-muted-foreground/40 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>
      )}

      {/* Word rows */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {onReviewDeck && items.length > 0 && (
              <div className="border-t border-border/60 bg-accent/[0.03] p-3 sm:p-4">
                {/* Secondary to Memory Lab's main review at the top of the page. */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onReviewDeck(name)}
                  className="w-full"
                >
                  <BrainCircuit aria-hidden="true" />
                  {dueCount > 0 ? `Review ${dueCount} due` : `Practice this deck (${items.length})`}
                </Button>
              </div>
            )}

            <div className="divide-y divide-border/40 border-t border-border/60">
              {items.map((item) => {
                const isExpanded = expandedId === item.id
                if (isExpanded) {
                  return (
                    <div key={item.id} className="bg-accent/[0.03] p-3 sm:p-4">
                      <VocabCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="mt-2 w-full rounded-xl py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
                      >
                        Collapse
                      </button>
                    </div>
                  )
                }

                return (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 sm:px-4">
                    <button
                      type="button"
                      onClick={() => setExpandedId(item.id)}
                      aria-label={`Open ${item.term}${item.meaning ? `, ${item.meaning}` : ""}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-xl font-semibold text-foreground sm:text-2xl">
                            {item.term}
                          </span>
                          {item.pronunciation ? (
                            <span className="hidden truncate text-sm italic text-muted-foreground sm:inline">
                              {item.pronunciation}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            "truncate text-sm sm:text-base",
                            item.meaning
                              ? "text-muted-foreground"
                              : "italic text-muted-foreground/50",
                          )}
                        >
                          {item.meaning || "No meaning yet"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
                          masteryColor(item.mastery),
                        )}
                      >
                        {item.mastery}%
                      </span>
                    </button>
                    <SpeakButton
                      text={item.term}
                      className="h-10 w-10 shrink-0 rounded-xl bg-accent/30"
                    />
                  </div>
                )
              })}
            </div>

            {onAdd && <DeckAddForm category={name} onAdd={onAdd} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
