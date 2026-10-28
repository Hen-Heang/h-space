"use client"

import { useQuery } from "@tanstack/react-query"
import { BriefcaseBusiness, Flame, LayoutGrid, Target, type LucideIcon } from "lucide-react"

import { goalsQueryKey } from "@/hooks/useGoals"
import { useStreak } from "@/hooks/useStreak"
import { goalsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { selectActiveGoals } from "@/lib/home-dashboard"
import { hSpaceProjects } from "@/lib/projects"
import { cn } from "@/lib/utils"

const TONES = {
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const

const appCount = hSpaceProjects.filter((p) => p.links.some((l) => l.kind === "app")).length

function formatCount(value: number | null) {
  return value == null ? "—" : String(value).padStart(2, "0")
}

function Metric({
  icon: Icon,
  tone,
  label,
  value,
  caption,
}: {
  icon: LucideIcon
  tone: keyof typeof TONES
  label: string
  value: string
  caption: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-950/[0.03]">
      <div className="flex items-center gap-3">
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[tone])}
        >
          <Icon size={17} strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <p className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </p>
    </div>
  )
}

/**
 * Overview's "Your snapshot" row (Figma "Metric / Card"). Every number comes
 * from an existing query cache or the static project catalog — goals share
 * `goalsQueryKey` with ActiveGoalsCard, so this adds no extra fetch.
 */
export function SnapshotMetrics() {
  const userId = getUserId()
  const { data: goals, isError } = useQuery({
    queryKey: goalsQueryKey(userId),
    queryFn: () => goalsApi.list(),
    enabled: userId != null,
  })
  const { streakDays } = useStreak()
  const activeGoals = goals && !isError ? selectActiveGoals(goals, goals.length).length : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Metric
        icon={LayoutGrid}
        tone="violet"
        label="Active apps"
        value={formatCount(appCount)}
        caption="Connected to H-Space"
      />
      <Metric
        icon={Target}
        tone="blue"
        label="Goals in focus"
        value={formatCount(activeGoals)}
        caption="Keep your momentum"
      />
      <Metric
        icon={Flame}
        tone="emerald"
        label="Day streak"
        value={formatCount(streakDays)}
        caption="Days in a row"
      />
      <Metric
        icon={BriefcaseBusiness}
        tone="amber"
        label="Projects"
        value={formatCount(hSpaceProjects.length)}
        caption="In your portfolio"
      />
    </div>
  )
}
