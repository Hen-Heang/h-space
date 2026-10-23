import Link from "next/link"
import { ArrowRight, Flame, GraduationCap } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { DailyMission } from "@/lib/api"

/**
 * Compact learning widget for Overview: today's Korean practice as one line
 * of progress plus a single action. The full mission checklist lives on
 * `/learn` and `/practice` — Overview only says whether there's practice left.
 * Reads the same `useDailyMission` / `useStreak` data the page passes in.
 */
export function LearningWidget({
  mission,
  loading,
  error,
  streakDays,
}: {
  mission: DailyMission | null
  loading: boolean
  error: boolean
  streakDays: number | null | undefined
}) {
  const items = mission?.items ?? []
  const completed = items.filter((item) => item.status === "completed").length
  const allDone = items.length > 0 && completed === items.length
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GraduationCap size={15} className="text-muted-foreground" aria-hidden="true" />
          Korean practice
        </h3>
        {streakDays != null && streakDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame size={13} className="text-orange-500" aria-hidden="true" />
            {streakDays}-day streak
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-10 w-full rounded-md" />
      ) : error || !mission ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Couldn&apos;t load today&apos;s practice.{" "}
          <Link href="/learn" className="font-medium text-foreground hover:underline">
            Open Learning
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length === 0
              ? "No practice planned for today."
              : allDone
                ? "Today's practice is done."
                : `${completed} of ${items.length} done · about ${mission.estimatedMinutes} min`}
          </p>
          {items.length > 0 && (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Today's Korean practice"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </>
      )}

      <Link
        href={allDone ? "/learn" : "/practice"}
        className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {allDone ? "Go to Learning" : "Start practice"}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  )
}
