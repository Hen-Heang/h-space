"use client"

import { useMemo } from "react"
import { BookOpenCheck, CheckCircle2, Layers3 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { VocabItem } from "@/lib/types"

type EssentialBooksPanelProps = {
  words: VocabItem[]
  loading: boolean
}

type BookDefinition = {
  key: "beginner" | "intermediate"
  title: string
  sourceTag: string
  levelTag: string
  accent: string
  progress: string
}

type TermSnapshot = {
  mastery: number
  p1: boolean
  p2: boolean
}

const BOOKS: BookDefinition[] = [
  {
    key: "beginner",
    title: "2000 Essential · Beginner",
    sourceTag: "source:2000-essential-beginner",
    levelTag: "level:beginner",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    progress: "bg-emerald-500",
  },
  {
    key: "intermediate",
    title: "2000 Essential · Intermediate",
    sourceTag: "source:2000-essential-intermediate",
    levelTag: "level:intermediate",
    accent: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    progress: "bg-sky-500",
  },
]

function normalizeTerm(term: string) {
  return term.trim().normalize("NFC")
}

function summarizeBook(words: VocabItem[], sourceTag: string) {
  const terms = new Map<string, TermSnapshot>()

  for (const word of words) {
    if (!word.tags?.includes(sourceTag)) continue

    const key = normalizeTerm(word.term)
    if (!key) continue

    const previous = terms.get(key)
    terms.set(key, {
      mastery: Math.max(previous?.mastery ?? 0, word.mastery ?? 0),
      p1: (previous?.p1 ?? false) || word.tags.includes("priority:p1"),
      p2: (previous?.p2 ?? false) || word.tags.includes("priority:p2"),
    })
  }

  const snapshots = Array.from(terms.values())
  const total = snapshots.length
  const mastered = snapshots.filter((item) => item.mastery >= 80).length
  const averageMastery =
    total === 0 ? 0 : Math.round(snapshots.reduce((sum, item) => sum + item.mastery, 0) / total)

  return {
    total,
    p1: snapshots.filter((item) => item.p1).length,
    p2: snapshots.filter((item) => item.p2).length,
    mastered,
    averageMastery,
  }
}

export function EssentialBooksPanel({ words, loading }: EssentialBooksPanelProps) {
  const summaries = useMemo(
    () => BOOKS.map((book) => ({ ...book, stats: summarizeBook(words, book.sourceTag) })),
    [words],
  )

  const totalSelected = summaries.reduce((sum, book) => sum + book.stats.total, 0)
  const totalMastered = summaries.reduce((sum, book) => sum + book.stats.mastered, 0)

  return (
    <section
      aria-labelledby="essential-books-title"
      className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm dark:bg-slate-900/50"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <BookOpenCheck size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-kicker">Essential Korean books</p>
            <h2
              id="essential-books-title"
              className="mt-1 text-lg font-semibold text-foreground sm:text-xl"
            >
              Beginner → Intermediate core path
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Curated coverage from the two 2000 Essential Korean Words books. P1 is the must-know
              speaking foundation; P2 is the next practical layer for daily life, work, and study.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {summaries.map((book) => {
            const { stats } = book
            const masteredPercent =
              stats.total === 0 ? 0 : Math.round((stats.mastered / stats.total) * 100)

            return (
              <article
                key={book.key}
                className="rounded-2xl border border-border/60 bg-muted/25 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{book.title}</h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          book.accent,
                        )}
                      >
                        {book.key === "beginner" ? "Beginner" : "Intermediate"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Current curated selection</p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground ring-1 ring-border/60">
                    <Layers3 size={17} aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Metric label="Selected" value={loading ? "…" : stats.total} />
                  <Metric label="P1" value={loading ? "…" : stats.p1} />
                  <Metric label="P2" value={loading ? "…" : stats.p2} />
                  <Metric label="Mastered" value={loading ? "…" : stats.mastered} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-muted-foreground">Mastery progress</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {loading ? "…" : `${masteredPercent}%`}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`${book.title} mastery`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={masteredPercent}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        book.progress,
                      )}
                      style={{ width: `${masteredPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Average card mastery:{" "}
                    <span className="font-semibold text-foreground">
                      {loading ? "…" : `${stats.averageMastery}%`}
                    </span>
                  </p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-foreground">{loading ? "…" : totalSelected}</span>{" "}
            curated source terms are represented across both book paths.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span className="font-semibold text-foreground">
              {loading ? "…" : totalMastered}
            </span>{" "}
            mastered
          </p>
        </div>
      </div>
    </section>
  )
}

type MetricProps = {
  label: string
  value: number | string
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-0 rounded-xl bg-background px-2.5 py-2.5 ring-1 ring-border/50 sm:px-3">
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground sm:text-base">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-xs">
        {label}
      </p>
    </div>
  )
}
