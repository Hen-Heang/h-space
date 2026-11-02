import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

// "n of m completed", a thin bar, and one Continue button — the header of a
// course-like list (a Foundations track, the Reading units). The Continue
// target is chosen by the caller from real progress (lib/learning/course.ts);
// with nothing left it says so instead of offering a dead button.
export function CourseProgress({
  title,
  completed,
  total,
  continueHref,
  continueLabel,
}: {
  title: string
  completed: number
  total: number
  continueHref?: string
  /** e.g. "Lesson 4: Numbers" — what Continue opens. */
  continueLabel?: string
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <section
      aria-label={`${title} progress`}
      className="app-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {completed} of {total} completed
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={`${title} completed`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        {continueHref && continueLabel && (
          <p className="mt-2 truncate text-xs text-muted-foreground">Up next: {continueLabel}</p>
        )}
      </div>
      {continueHref ? (
        <Button asChild className="shrink-0">
          <Link href={continueHref}>
            {completed > 0 ? "Continue" : "Start"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        total > 0 && (
          <p className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            All completed
          </p>
        )
      )}
    </section>
  )
}
