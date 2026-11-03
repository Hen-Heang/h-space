"use client"

import { useQuery } from "@tanstack/react-query"
import { BriefcaseBusiness, Flame, LayoutGrid, Target, type LucideIcon } from "lucide-react"

import { goalsQueryKey } from "@/hooks/useGoals"
import { useStreak } from "@/hooks/useStreak"
import { goalsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { selectActiveGoals } from "@/lib/home-dashboard"
import { hSpaceProjects } from "@/lib/projects"

const appCount = hSpaceProjects.filter((p) => p.links.some((l) => l.kind === "app")).length

function formatCount(value: number | null) {
  return value == null ? "—" : String(value)
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <Icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      <p className="min-w-0">
        <span className="block text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </span>
        <span className="block truncate text-sm text-muted-foreground">{label}</span>
      </p>
    </div>
  )
}

/**
 * Overview's "Your snapshot" strip. Every number comes from an existing query
 * cache or the static project catalog — goals share `goalsQueryKey` with
 * ActiveGoalsCard, so this adds no extra fetch. A quiet secondary summary
 * below the daily work, not four cards above it.
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
    <div className="app-surface-muted grid grid-cols-2 lg:grid-cols-4">
      <Metric icon={LayoutGrid} label="Active apps" value={formatCount(appCount)} />
      <Metric icon={Target} label="Goals in focus" value={formatCount(activeGoals)} />
      <Metric icon={Flame} label="Day streak" value={formatCount(streakDays)} />
      <Metric
        icon={BriefcaseBusiness}
        label="Projects"
        value={formatCount(hSpaceProjects.length)}
      />
    </div>
  )
}
