"use client"

import { useState } from "react"
import { ArrowRight, Check, RotateCcw, Volume2 } from "lucide-react"

import { PRONUNCIATION_DISCLAIMER, ScoreHonestyNote } from "@/components/interview/ScoreHonestyNote"
import { CorrectionDiff } from "@/components/learn/CorrectionDiff"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { SpeakingCheckResponse } from "@/lib/api/interview"
import { averageScore, scoreImprovement, shouldRecommendRetry } from "@/lib/interview-practice"

// Re-exported so existing imports keep working; the wording lives in ScoreHonestyNote.
export { PRONUNCIATION_DISCLAIMER }

interface CorrectionRetryPanelProps {
  questionId: string
  firstAnswer: string
  firstResult: SpeakingCheckResponse
  retryAnswer?: string
  retryResult?: SpeakingCheckResponse
  onRetry: () => void
  onNext: () => void
  isLast: boolean
}

export function CorrectionRetryPanel({
  questionId,
  firstAnswer,
  firstResult,
  retryAnswer,
  retryResult,
  onRetry,
  onNext,
  isLast,
}: CorrectionRetryPanelProps) {
  const activeResult = retryResult ?? firstResult
  const firstScore = averageScore(firstResult.scores)
  const retryScore = retryResult ? averageScore(retryResult.scores) : null
  const improvement = retryScore === null ? null : scoreImprovement(firstScore, retryScore)
  const storageKey = `koriai.interview.mentor-checked:${questionId}`
  const [mentorChecked, setMentorChecked] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === "true"
    } catch {
      return false
    }
  })

  function toggleMentorChecked() {
    const next = !mentorChecked
    setMentorChecked(next)
    try {
      window.localStorage.setItem(storageKey, String(next))
    } catch {
      // Session-only state remains available when storage is blocked.
    }
  }

  return (
    <Card className="rounded-2xl border-blue-500/25 bg-card shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Correction available
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {retryResult
                ? "Compare your retry with the first attempt."
                : "Read the correction aloud, then answer the same question again."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={mentorChecked}
            onClick={toggleMentorChecked}
            className="rounded-lg"
          >
            {mentorChecked ? <Check className="mr-1.5 size-4" /> : null}Mentor checked
          </Button>
        </div>

        <section aria-labelledby="you-said-heading">
          <h3 id="you-said-heading" className="text-xs font-medium text-muted-foreground">
            1. You said
          </h3>
          <p
            lang="ko"
            className="mt-1 rounded-xl bg-muted/40 p-3 text-sm leading-relaxed text-foreground"
          >
            {retryAnswer ?? firstAnswer}
          </p>
        </section>

        <section aria-labelledby="corrected-heading">
          <h3 id="corrected-heading" className="text-xs font-medium text-muted-foreground">
            2. Corrected answer
          </h3>
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-border p-3">
            <p
              lang="ko"
              className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-foreground"
            >
              {activeResult.correctedAnswer}
            </p>
            <SpeakButton
              text={activeResult.correctedAnswer}
              title="Play corrected answer"
              className="shrink-0"
            />
          </div>
          <CorrectionDiff
            before={retryAnswer ?? firstAnswer}
            after={activeResult.correctedAnswer}
            className="mt-3"
          />
        </section>

        <section aria-labelledby="natural-heading">
          <h3 id="natural-heading" className="text-xs font-medium text-muted-foreground">
            3. More natural answer
          </h3>
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p
              lang="ko"
              className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-foreground"
            >
              {activeResult.betterAlternative}
            </p>
            <SpeakButton
              text={activeResult.betterAlternative}
              title="Play natural answer"
              className="shrink-0"
            />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-muted-foreground">4. Short explanation</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{activeResult.feedback}</p>
        </section>

        <section>
          <h3 className="text-xs font-medium text-muted-foreground">5. One speaking tip</h3>
          <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-foreground">
            <Volume2 className="mt-0.5 size-4 shrink-0 text-amber-600" />
            {activeResult.tip}
          </p>
        </section>

        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <span>
              First attempt <strong>{firstScore.toFixed(1)} / 5</strong>
            </span>
            {retryScore !== null ? (
              <span>
                Retry <strong>{retryScore.toFixed(1)} / 5</strong>
              </span>
            ) : null}
            {improvement !== null ? (
              <Badge variant="outline">
                Improvement {improvement >= 0 ? "+" : ""}
                {improvement.toFixed(1)}
              </Badge>
            ) : null}
          </div>
          <ScoreHonestyNote className="mt-2">{PRONUNCIATION_DISCLAIMER}</ScoreHonestyNote>
          {!retryResult && shouldRecommendRetry(firstScore) ? (
            <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              Your average is below 3.5. Retry once before continuing if you can.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button type="button" size="lg" onClick={onRetry} className="h-12 rounded-xl">
            <RotateCcw className="mr-2 size-4" />
            Retry Answer
          </Button>
          <Button type="button" variant="ghost" onClick={onNext} className="h-12 rounded-xl px-5">
            {isLast ? "Complete session" : "Next Question"}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
