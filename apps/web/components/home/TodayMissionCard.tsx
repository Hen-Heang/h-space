import Link from "next/link"
import { CheckCircle2, PartyPopper, Sparkles } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { missionItemSummary } from "@/lib/learning/mission-item-display"
import { skillLabel } from "@/lib/learning/skills"
import { cn } from "@/lib/utils"
import type { DailyMission } from "@/lib/api"

export function TodayMissionCard({
  mission,
  loading,
  error,
}: {
  mission: DailyMission | null
  loading: boolean
  error: boolean
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-3xl sm:h-56" />

  if (error || !mission) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        Couldn&apos;t load today&apos;s practice. Try refreshing.
      </div>
    )
  }

  const items = mission.items
  const completedCount = items.filter((i) => i.status === "completed").length
  const allDone = items.length > 0 && completedCount === items.length
  const focusLabels = mission.focusSkillCodes.slice(0, 2).map(skillLabel)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] via-card to-card p-5 shadow-sm dark:from-violet-500/[0.1] dark:via-slate-900/60 dark:to-slate-900/60 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/15 dark:text-violet-400">
            {allDone ? <PartyPopper size={18} /> : <Sparkles size={18} />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
              Today&apos;s Korean
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {mission.estimatedMinutes} min
              {focusLabels.length > 0 ? ` · ${focusLabels.join(", ")}` : ""}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-background/70 px-2.5 py-1 text-xs font-bold text-foreground dark:bg-white/5">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-accent/40">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const done = item.status === "completed"
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2 text-sm",
                done ? "text-muted-foreground/60 line-through" : "text-foreground",
              )}
            >
              <CheckCircle2
                size={15}
                className={cn("shrink-0", done ? "text-emerald-500" : "text-muted-foreground/30")}
              />
              {missionItemSummary(item)}
            </li>
          )
        })}
      </ul>

      {mission.reason && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Based on {mission.reason.charAt(0).toLowerCase() + mission.reason.slice(1)}
        </p>
      )}

      <Link
        href="/practice"
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-500 active:scale-[0.985] dark:bg-violet-500 dark:hover:bg-violet-400"
      >
        {allDone ? "Practice again" : "Start today's practice"}
      </Link>
    </div>
  )
}
