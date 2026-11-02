"use client"

import { useState } from "react"
import { ChevronRight, Eye } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { PhraseRegisterBadge } from "@/components/phrasebook/PhraseRegisterBadge"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { formatInterval, previewIntervalDays, RATINGS, type ReviewRating } from "@/lib/srs"
import { cn } from "@/lib/utils"
import type { PhraseCardWithProgress } from "@/lib/types"

interface ReviewModeViewProps {
  cards: PhraseCardWithProgress[]
  onExhausted: () => void
}

const GRADE_STYLES: Record<ReviewRating, { label: string; classes: string }> = {
  AGAIN: { label: "Again", classes: "bg-grade-again" },
  HARD: { label: "Hard", classes: "bg-grade-hard" },
  GOOD: { label: "Good", classes: "bg-grade-good" },
  EASY: { label: "Easy", classes: "bg-grade-easy" },
}

export function ReviewModeView({ cards, onExhausted }: ReviewModeViewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const card = cards[index]
  if (!card) return null

  const srsState = {
    easeFactor: card.progress?.easeFactor ?? 2.5,
    intervalDays: card.progress?.intervalDays ?? 0,
    repetitions: card.progress?.repetitions ?? 0,
  }
  const recommended = card.answers.find((a) => a.isRecommended) ?? card.answers[0]

  function skip() {
    if (index + 1 >= cards.length) {
      onExhausted()
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  async function grade(rating: ReviewRating) {
    setSaving(true)
    setError("")
    try {
      await phrasebookApi.rate(card.id, rating)
      if (index + 1 >= cards.length) {
        onExhausted()
      } else {
        setIndex((i) => i + 1)
        setRevealed(false)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this review. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>{card.situation}</span>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-b-[6px] border-border bg-card p-6 text-center dark:bg-slate-900/60 sm:p-8">
        <PhraseRegisterBadge register={card.question.register} />
        <p
          lang="ko"
          className="break-keep text-2xl font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-3xl"
        >
          {card.question.korean}
        </p>
        <SpeakButton text={card.question.korean} title="Listen to the question" />
        <p className="text-sm text-muted-foreground">Recall or say your answer, then reveal.</p>
      </div>

      {error && <p className="text-center text-xs font-semibold text-destructive">{error}</p>}

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-border bg-card text-sm font-bold uppercase tracking-wide text-foreground transition-all active:translate-y-[3px] active:border-b-0"
        >
          <Eye size={18} strokeWidth={2.5} /> Reveal answer
        </button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-5 text-center">
            {recommended && (
              <>
                <p
                  lang="ko"
                  className="break-keep text-xl font-bold text-foreground [overflow-wrap:anywhere]"
                >
                  {recommended.korean}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {recommended.english}
                </p>
              </>
            )}
            {card.answers.filter((a) => a !== recommended).length > 0 && (
              <div className="mt-3 space-y-1 border-t border-emerald-500/20 pt-3 text-left">
                {card.answers
                  .filter((a) => a !== recommended)
                  .map((a, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      <span lang="ko">{a.korean}</span> — {a.english}
                    </p>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                disabled={saving}
                onClick={() => grade(rating)}
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-b-4 border-black/25 px-1 text-white transition-all active:translate-y-[3px] active:border-b-0 disabled:opacity-60",
                  GRADE_STYLES[rating].classes,
                )}
              >
                <span className="max-w-full truncate text-xs font-bold uppercase tracking-wider">
                  {GRADE_STYLES[rating].label}
                </span>
                <span className="max-w-full truncate text-xs font-semibold opacity-90">
                  {formatInterval(previewIntervalDays(srsState, rating))}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={skip}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Skip <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
