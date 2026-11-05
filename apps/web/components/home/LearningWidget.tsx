import { Flame } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { DailyMission } from "@/lib/api"

import { CompactSummary } from "./home-primitives"

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
  const action = loading
    ? undefined
    : error || !mission
      ? { href: "/learn", label: "Open Learning" }
      : allDone
        ? { href: "/learn", label: "Go to Learning" }
        : { href: "/practice", label: "Start practice" }

  return (
    <CompactSummary title="Korean practice" action={action}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {loading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : error || !mission ? (
          <p className="py-2 text-sm text-muted-foreground">
            Couldn&apos;t load today&apos;s practice.
          </p>
        ) : (
          <p className="py-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "No practice planned for today."
              : allDone
                ? "Today’s practice is done."
                : `${completed} of ${items.length} done · about ${mission.estimatedMinutes} min`}
          </p>
        )}
        {streakDays != null && streakDays > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
            <Flame size={14} aria-hidden="true" />
            {streakDays}-day streak
          </span>
        )}
      </div>
      {!loading && !error && mission && items.length > 0 && (
        <div
          className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Today's Korean practice"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </CompactSummary>
  )
}
