"use client"

import { useId, useSyncExternalStore } from "react"
import { AlertCircle, RotateCcw, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ScorecardRecord } from "@/lib/interview-history"
import {
  mostDifficultQuestions,
  summarizeQuestionProgress,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"

/**
 * Where practice stands: question-bank status from the synced progress rows,
 * the latest mock score, and the weakest questions. Replaces the duplicate
 * progress blocks that lived on the hub and on the Speaking dashboard.
 */
export function ExamProgressCard({
  questions,
  progress,
  history,
  loading,
  error,
  onRetry,
  historySyncFailed,
  onRetryHistory,
}: {
  questions: QuestionBankItem[]
  progress: Record<string, QuestionProgress>
  history: ScorecardRecord[]
  loading: boolean
  error: boolean
  onRetry: () => void
  historySyncFailed: boolean
  onRetryHistory: () => void
}) {
  const headingId = useId()
  const summary = summarizeQuestionProgress(questions, progress)
  const weakest = summary.practiced > 0 ? mostDifficultQuestions(questions, progress, 3) : []
  // Scorecards come from localStorage on the first client render but are empty
  // on the server; read them only after mount so hydration matches.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const latest = mounted ? (history.at(-1) ?? null) : null

  return (
    <section aria-labelledby={headingId} className="app-surface flex flex-col gap-4 p-5 sm:p-6">
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
        <TrendingUp aria-hidden="true" className="size-4 text-primary" />
        Progress
      </h2>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading your progress">
          <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-foreground/90">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            Couldn&apos;t load your practice progress.
          </p>
          <Button variant="outline" onClick={onRetry} className="h-11">
            <RotateCcw aria-hidden="true" /> Retry
          </Button>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-foreground">
              {summary.practiced} of {summary.total} questions practiced
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ["Strong", summary.strong],
                ["Improving", summary.improving],
                ["Need a retry", summary.needsRetry],
                ["New", summary.newCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/30 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {weakest.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Weakest questions</p>
              <ul className="mt-2 space-y-1.5">
                {weakest.map((question) => (
                  <li
                    key={question.id}
                    lang="ko"
                    className="line-clamp-2 break-keep text-sm text-foreground"
                  >
                    {question.questionKo}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Finish today&apos;s practice to see which questions need work.
            </p>
          )}
        </>
      )}

      <div className="mt-auto border-t border-border pt-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Latest mock interview</p>
        {latest ? (
          <p className="mt-1 text-foreground">
            <span className="font-semibold tabular-nums">{latest.overall.toFixed(1)} / 5</span>{" "}
            <span className="text-xs text-muted-foreground">
              · AI estimate from your transcript ·{" "}
              {new Date(latest.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">None yet — take one to get a baseline score.</p>
        )}
        {historySyncFailed && (
          <div
            role="alert"
            className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2 text-xs text-foreground/90">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
              Couldn&apos;t load mock results saved to your account. Showing this device only.
            </p>
            <Button variant="outline" size="sm" onClick={onRetryHistory} className="h-10">
              <RotateCcw aria-hidden="true" /> Retry
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
