"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Plus, RotateCcw } from "lucide-react"

import { PRONUNCIATION_DISCLAIMER, ScoreHonestyNote } from "@/components/interview/ScoreHonestyNote"
import { Button } from "@/components/ui/button"
import { checkedAttempts, type PracticeRun } from "@/lib/answer-practice"
import { averageSpeakingScores } from "@/lib/interview-drills"
import { averageScore } from "@/lib/interview-practice"

/**
 * End of a practice set: what was answered and checked, question by
 * question, with the transcript-score caveat whenever an AI check ran.
 */
export function PracticeSummary({
  runs,
  onPracticeAgain,
  onMoreLikeThis,
  addingMore,
}: {
  runs: PracticeRun[]
  onPracticeAgain: () => void
  /** AI sets only: append a few similar questions. */
  onMoreLikeThis?: () => void
  addingMore?: boolean
}) {
  const checkedRuns = runs.filter((run) => checkedAttempts(run).length > 0)
  const retried = checkedRuns.filter((run) => checkedAttempts(run).length > 1).length
  const averages = averageSpeakingScores(
    checkedRuns.flatMap((run) => checkedAttempts(run).map((attempt) => attempt.result!.scores)),
  )

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <section className="app-surface p-6 text-center sm:p-8" aria-labelledby="practice-done">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-primary" />
        <h2 id="practice-done" className="mt-4 text-2xl font-bold text-foreground">
          {runs.length > 0 ? "Practice set complete" : "No answers this time"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {runs.length > 0
            ? `You answered ${runs.length} question${runs.length === 1 ? "" : "s"}, checked ${checkedRuns.length}, and retried ${retried}.`
            : "Start again and answer at least one question out loud."}
        </p>
        {averages && (
          <dl className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3">
            {(
              [
                ["Speaking", averages.speaking],
                ["Grammar", averages.grammar],
                ["Vocabulary", averages.vocabulary],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">{value.toFixed(1)}</dd>
              </div>
            ))}
          </dl>
        )}
        {averages && (
          <ScoreHonestyNote className="mx-auto mt-4 max-w-md justify-center text-left">
            {PRONUNCIATION_DISCLAIMER}
          </ScoreHonestyNote>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button size="lg" onClick={onPracticeAgain} className="h-12">
            <RotateCcw aria-hidden="true" /> Practice again
          </Button>
          {onMoreLikeThis && (
            <Button
              size="lg"
              variant="outline"
              onClick={onMoreLikeThis}
              disabled={addingMore}
              className="h-12"
            >
              {addingMore ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              3 more like these
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="h-12">
            <Link href="/interview">
              <ArrowLeft aria-hidden="true" /> Back to Exam Prep
            </Link>
          </Button>
        </div>
      </section>

      {runs.length > 0 && (
        <section aria-labelledby="practice-breakdown" className="app-surface">
          <h3
            id="practice-breakdown"
            className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground"
          >
            Question by question
          </h3>
          <ol className="divide-y divide-border">
            {runs.map((run, index) => {
              const checked = checkedAttempts(run)
              const first = checked[0]?.result
              const last = checked.at(-1)?.result
              const firstScore = first ? averageScore(first.scores) : null
              const lastScore = last ? averageScore(last.scores) : null
              return (
                <li key={`${run.question.id ?? run.question.ko}-${index}`} className="px-5 py-4">
                  <p lang="ko" className="break-keep text-sm font-semibold text-foreground">
                    {index + 1}. {run.question.ko}
                  </p>
                  {last?.correctedAnswer && (
                    <p lang="ko" className="mt-1 break-keep text-sm text-muted-foreground">
                      {last.correctedAnswer}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {firstScore === null
                      ? "Compared — not checked"
                      : checked.length > 1 && lastScore !== null
                        ? `${firstScore.toFixed(1)} → ${lastScore.toFixed(1)} / 5 after retry`
                        : `${firstScore.toFixed(1)} / 5`}
                  </p>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
