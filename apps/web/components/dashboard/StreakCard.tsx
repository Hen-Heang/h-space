import { Flame, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

type StreakCardProps = {
  days: number
  wordsSaved: number
  className?: string
}

export function StreakCard({ days, wordsSaved, className }: StreakCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40 lg:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Momentum</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            Active streak
          </h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Flame size={20} />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tighter text-foreground sm:text-6xl">
            {days}
          </span>
          <span className="text-lg font-medium text-muted-foreground">days</span>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-orange-500/5 p-3 text-xs font-medium text-orange-700 dark:text-orange-300">
          <Trophy size={16} className="shrink-0" />
          <span>You&apos;ve saved {wordsSaved} words during this streak.</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-accent/5 p-3 dark:bg-white/5">
          <p className="text-xs font-medium text-muted-foreground">Level</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {days >= 7 ? "Master" : "Rising"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-accent/5 p-3 dark:bg-white/5">
          <p className="text-xs font-medium text-muted-foreground">Next milestone</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {days + (7 - (days % 7))} days
          </p>
        </div>
      </div>
    </div>
  )
}
