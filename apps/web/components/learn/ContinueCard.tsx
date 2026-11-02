import Link from "next/link"
import { ArrowRight, CheckCircle2, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { nextReviewBatchSize, type DailyMission } from "@/lib/api"
import { hubStepHref, selectHubContinue } from "@/lib/learning/hub"
import {
  missionItemCtaLabel,
  missionItemHref,
  missionItemLabel,
  missionItemSummary,
} from "@/lib/learning/mission-item-display"

// The Learning Hub's one primary action — the daily mission's next step
// (kori_daily_missions, the same row /home and /practice read). The title is
// the step's itemized summary ("20 words to review"), not the engine's
// `title`, which carries the whole backlog ("Review 1886 vocabulary cards")
// rather than what one session actually covers.
export function ContinueCard({
  mission,
  loading,
  error,
  onRetry,
  dueCount,
  dueLoading,
}: {
  mission: DailyMission | null
  loading: boolean
  error: boolean
  onRetry: () => void
  /** Vocabulary due right now — live, unlike the mission's morning snapshot. */
  dueCount: number
  dueLoading: boolean
}) {
  if (loading) return <Skeleton className="h-48 w-full rounded-lg" />

  if (error) {
    return (
      <section aria-labelledby="continue-heading" className="app-surface p-5 sm:p-6">
        <h2 id="continue-heading" className="text-base font-semibold text-foreground">
          Couldn&apos;t load today&apos;s plan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again, or open Daily Practice directly.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/practice">Open Daily Practice</Link>
          </Button>
        </div>
      </section>
    )
  }

  const next = selectHubContinue(mission, dueLoading ? 0 : nextReviewBatchSize(dueCount))

  if (next.kind === "done" || next.kind === "extra-review") {
    return (
      <section aria-labelledby="continue-heading" className="app-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 id="continue-heading" className="text-base font-semibold text-foreground">
              Today&apos;s practice is done
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dueLoading
                ? "Checking what else is due…"
                : next.kind === "extra-review"
                  ? `${dueCount.toLocaleString()} ${dueCount === 1 ? "word is" : "words are"} due now — extra reps are optional.`
                  : "You're all caught up. A new plan arrives tomorrow."}
            </p>
          </div>
        </div>
        {next.kind === "extra-review" && (
          <Button size="lg" className="mt-5 w-full sm:w-auto" asChild>
            <Link href="/vocab?review=session">
              Review {next.batch} more
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </section>
    )
  }

  if (next.kind === "start") {
    return (
      <section aria-labelledby="continue-heading" className="app-surface p-5 sm:p-6">
        <p className="app-kicker">Today</p>
        <h2 id="continue-heading" className="mt-2 text-xl font-semibold text-foreground">
          Start today&apos;s practice
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A short plan built from your due words, mistakes, and weakest skill.
        </p>
        <Button size="lg" className="mt-5 w-full sm:w-auto" asChild>
          <Link href="/practice">
            Start practice
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    )
  }

  const { item, position, total } = next
  const showDue = item.type === "vocab_review" && !dueLoading && dueCount > 0

  return (
    <section
      aria-labelledby="continue-heading"
      className="app-surface border-primary/30 bg-linear-to-br from-primary/[0.06] to-card p-5 sm:p-6"
    >
      <p className="app-kicker">
        Continue · Step {position} of {total}
      </p>
      <h2 id="continue-heading" className="mt-2 text-xl font-semibold leading-snug text-foreground">
        {missionItemSummary(item)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {missionItemLabel(item.type)} · {item.estimatedMinutes} min
        {showDue && ` · ${dueCount.toLocaleString()} due now`}
      </p>
      <Button size="lg" className="mt-5 w-full sm:w-auto" asChild>
        <Link href={hubStepHref(item, missionItemHref(item))}>
          {missionItemCtaLabel(item.type)}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  )
}
