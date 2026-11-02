"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TodayPracticePlan } from "@/lib/exam-prep-home"

/** Starts Today's 5 directly; the plain `/interview/speaking` still opens its dashboard. */
export const TODAY_PRACTICE_HREF = "/interview/speaking?start=today"

/**
 * The home's primary card: today's five questions — how many are done, the
 * next one, and one button that starts (or continues) them.
 */
export function TodayPracticeCard({
  plan,
  loading,
  error,
  onRetry,
  levelLabel,
}: {
  plan: TodayPracticePlan
  loading: boolean
  error: boolean
  onRetry: () => void
  levelLabel: string
}) {
  const headingId = useId()
  const englishId = useId()
  const [showEnglish, setShowEnglish] = useState(false)
  const next = plan.next
  const percent = plan.total > 0 ? Math.round((plan.done / plan.total) * 100) : 0

  return (
    <section
      aria-labelledby={headingId}
      className="app-surface flex flex-col gap-3 p-5 sm:gap-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
            <Target aria-hidden="true" className="size-4 text-primary" />
            Today&apos;s practice
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">5 questions · {levelLabel} level</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading today's practice">
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-4/5 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-foreground/90">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            Couldn&apos;t load your question bank.
          </p>
          <Button variant="outline" onClick={onRetry} className="h-11">
            <RotateCcw aria-hidden="true" /> Retry
          </Button>
        </div>
      ) : plan.status === "empty" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your question bank is empty, so there&apos;s nothing to practice yet. Add questions in
            the bank, or start a mock interview.
          </p>
          <Button asChild variant="outline" className="h-11">
            <Link href="/interview/speaking">Open the question bank</Link>
          </Button>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-foreground">
                {plan.status === "done" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
                    All {plan.total} done today
                  </span>
                ) : (
                  `${plan.done} of ${plan.total} done`
                )}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Today's practice"
              aria-valuemin={0}
              aria-valuemax={plan.total}
              aria-valuenow={plan.done}
              aria-valuetext={`${plan.done} of ${plan.total} done`}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {next ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {plan.done === 0 ? "First question" : "Next question"}
              </p>
              <p
                lang="ko"
                className="mt-1 break-keep text-[17px] font-semibold leading-relaxed text-foreground"
              >
                {next.questionKo}
              </p>
              {next.questionEn && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEnglish((value) => !value)}
                    aria-expanded={showEnglish}
                    aria-controls={englishId}
                    className="relative mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline after:absolute after:-inset-3"
                  >
                    {showEnglish ? "Hide English" : "Show English"}
                  </button>
                  <p
                    id={englishId}
                    hidden={!showEnglish}
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {next.questionEn}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nice work. Take a mock interview, or practice the five again for extra reps.
            </p>
          )}

          <Button
            asChild
            size="lg"
            variant={plan.status === "done" ? "outline" : "default"}
            className="mt-auto h-12 w-full"
          >
            <Link href={TODAY_PRACTICE_HREF}>
              {plan.status === "not-started"
                ? "Start today's 5"
                : plan.status === "in-progress"
                  ? "Continue today's 5"
                  : "Practice them again"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </>
      )}
    </section>
  )
}
