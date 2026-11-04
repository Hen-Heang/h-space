"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Eye, RotateCcw, Sparkles, Trophy } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { cn } from "@/lib/utils"
import { correctionApi, getApiErrorMessage } from "@/lib/api"
import { formatInterval, previewIntervalDays, RATINGS, type ReviewRating } from "@/lib/srs"
import type { CorrectionReview } from "@/lib/types"

type Phase = "idle" | "quiz" | "done"

const GRADE_STYLES: Record<ReviewRating, { label: string; classes: string }> = {
  AGAIN: { label: "Again", classes: "bg-[#ff4b4b] border-[#e63b3b] text-white" },
  HARD: { label: "Hard", classes: "bg-[#ff9600] border-[#e08400] text-white" },
  GOOD: { label: "Good", classes: "bg-[#58cc02] border-[#46a302] text-white" },
  EASY: { label: "Easy", classes: "bg-[#1cb0f6] border-[#1499e0] text-white" },
}

// Mistakes are generated from chat, so the review queue lives inside AI
// Coach as a tab rather than as its own standalone destination.
export function CorrectionsReview({ onDone }: { onDone?: () => void }) {
  const [items, setItems] = useState<CorrectionReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [phase, setPhase] = useState<Phase>("idle")
  const [queue, setQueue] = useState<CorrectionReview[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [lapsedIds, setLapsedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    correctionApi
      .getDueReviews()
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err, "Could not load mistakes to review.")))
      .finally(() => setLoading(false))
  }, [])

  function start() {
    setQueue(items)
    setCurrentIndex(0)
    setRevealed(false)
    setLapsedIds(new Set())
    setPhase("quiz")
  }

  async function grade(rating: ReviewRating) {
    const card = queue[currentIndex]
    if (!card) return
    void correctionApi.rate(card.id, rating).catch(() => {})

    if (rating === "AGAIN") {
      setLapsedIds((prev) => new Set(prev).add(card.id))
      setQueue((q) => {
        const next = [...q]
        next.splice(currentIndex, 1)
        next.push({
          ...card,
          repetitions: 0,
          intervalDays: 0,
          easeFactor: Math.max(1.3, card.easeFactor - 0.2),
        })
        return next
      })
      setRevealed(false)
      if (currentIndex >= queue.length - 1) setCurrentIndex(0)
      return
    }

    setRevealed(false)
    if (currentIndex + 1 >= queue.length) {
      setPhase("done")
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const total = queue.length
  const card = queue[currentIndex]

  return (
    <div className="space-y-8 pb-12">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      )}

      {!loading && phase === "idle" && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl dark:bg-slate-900/40">
          <div className="border-b border-border/60 bg-red-500/[0.03] px-5 py-7 text-center sm:px-8 sm:py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
              <RotateCcw size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Mistake Review</h2>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {items.length > 0
                ? `${items.length} past mistakes are due for review`
                : "No mistakes are due — they'll resurface here if you forget them again."}
            </p>
          </div>
          <div className="flex flex-col gap-6 p-5 sm:p-8">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={start}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-red-600 text-base font-bold uppercase tracking-wide text-white shadow-xl shadow-red-600/30 transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              <Sparkles size={20} strokeWidth={2.5} />
              Start Review
            </button>
          </div>
        </div>
      )}

      {phase === "quiz" && card && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPhase("idle")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <span className="text-sm font-bold uppercase tracking-wide text-foreground">
              {currentIndex + 1} <span className="opacity-20 mx-1">/</span> {total}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={card.id + currentIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border-2 border-b-[6px] border-border bg-card p-6 dark:bg-slate-900/60 sm:p-8"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  What you wrote
                </p>
                {card.occurrenceCount > 1 && (
                  <Badge variant="outline">Seen {card.occurrenceCount}×</Badge>
                )}
              </div>
              <p className="mt-2 break-keep text-2xl font-bold leading-snug text-red-700 line-through dark:text-red-400 sm:text-3xl">
                {card.originalText}
              </p>

              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-border bg-accent/5 text-sm font-bold uppercase tracking-wide text-foreground active:translate-y-[3px] active:border-b-0"
                >
                  <Eye size={18} strokeWidth={2.5} /> Show Correction
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-5 dark:bg-emerald-500/[0.08]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/70 dark:text-emerald-400/70">
                          Correct
                        </p>
                        <p className="mt-1 break-keep text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                          {card.correctedText}
                        </p>
                      </div>
                      <SpeakButton text={card.correctedText} className="shrink-0" />
                    </div>
                  </div>

                  {card.naturalVersion && (
                    <div className="rounded-2xl border-2 border-sky-500/30 bg-sky-500/[0.05] p-5 dark:bg-sky-500/[0.07]">
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-700/70 dark:text-sky-400/70">
                        Natural Korean
                      </p>
                      <p className="mt-1 break-keep text-xl font-bold leading-snug text-foreground">
                        {card.naturalVersion}
                      </p>
                    </div>
                  )}

                  {card.explanation && (
                    <p className="text-sm leading-6 text-muted-foreground">{card.explanation}</p>
                  )}

                  {card.grammarPoints.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.grammarPoints.map((point) => (
                        <Badge key={point} variant="secondary">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2.5">
                    {RATINGS.map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => grade(rating)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-b-4 transition-all active:translate-y-[3px] active:border-b-0",
                          GRADE_STYLES[rating].classes,
                        )}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {GRADE_STYLES[rating].label}
                        </span>
                        <span className="text-xs font-bold opacity-80">
                          {formatInterval(previewIntervalDays(card, rating))}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {phase === "done" && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-6 px-5 py-10 text-center sm:px-8 sm:py-14">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <Trophy size={40} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Review complete</h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {Math.max(0, total - lapsedIds.size)} of {total} fixed on the first try.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPhase("idle")}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-xs font-bold uppercase tracking-wide text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95"
              >
                <CheckCircle2 size={16} strokeWidth={3} />
                Done
              </button>
              {onDone && (
                <button
                  type="button"
                  onClick={onDone}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background py-4 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-accent active:scale-95"
                >
                  Back to Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
