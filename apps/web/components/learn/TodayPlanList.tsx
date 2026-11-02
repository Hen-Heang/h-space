import Link from "next/link"
import { CheckCircle2, ChevronRight, Circle, CircleDot } from "lucide-react"

import type { DailyMission } from "@/lib/api"
import { hubStepHref, summarizeMissionProgress } from "@/lib/learning/hub"
import {
  missionItemHref,
  missionItemLabel,
  missionItemSummary,
} from "@/lib/learning/mission-item-display"
import { cn } from "@/lib/utils"

// Every step of today's mission as a compact checklist, so the hub shows how
// much is left — not just the next step. Status comes from the mission row,
// which missionsApi.refreshProgress re-checks against real evidence.
export function TodayPlanList({ mission }: { mission: DailyMission }) {
  if (mission.items.length === 0) return null

  const { completed, total, remainingMinutes } = summarizeMissionProgress(mission)
  const currentId = mission.items.find((item) => item.status !== "completed")?.id

  return (
    <section aria-labelledby="today-plan-heading" className="app-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="today-plan-heading" className="text-sm font-semibold text-foreground">
          Today&apos;s plan
        </h2>
        <p className="text-xs text-muted-foreground">
          {completed} of {total} done
          {remainingMinutes > 0 && ` · ~${remainingMinutes} min left`}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Today's plan progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      <ol className="mt-3 -mx-2">
        {mission.items.map((item) => {
          const done = item.status === "completed"
          const current = item.id === currentId
          const Icon = done ? CheckCircle2 : current ? CircleDot : Circle
          return (
            <li key={item.id}>
              <Link
                href={hubStepHref(item, missionItemHref(item))}
                aria-current={current ? "step" : undefined}
                className="group flex min-h-11 items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0",
                    done || current ? "text-primary" : "text-muted-foreground/60",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      done ? "text-muted-foreground line-through" : "font-medium text-foreground",
                    )}
                  >
                    {missionItemSummary(item)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {missionItemLabel(item.type)} · {item.estimatedMinutes} min
                    <span className="sr-only">{done ? ", done" : current ? ", up next" : ""}</span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
