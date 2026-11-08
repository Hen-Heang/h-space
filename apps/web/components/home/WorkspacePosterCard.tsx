import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ACCENTS = {
  blue: {
    glow: "bg-blue-500/10",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "hover:border-blue-500/40",
    eyebrow: "text-blue-600 dark:text-blue-400",
    cta: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    glow: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "hover:border-emerald-500/40",
    eyebrow: "text-emerald-600 dark:text-emerald-400",
    cta: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    glow: "bg-amber-500/10",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "hover:border-amber-500/40",
    eyebrow: "text-amber-600 dark:text-amber-400",
    cta: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    glow: "bg-violet-500/10",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    border: "hover:border-violet-500/40",
    eyebrow: "text-violet-600 dark:text-violet-400",
    cta: "text-violet-600 dark:text-violet-400",
  },
} as const

export interface WorkspacePosterStat {
  label: string
  value: string
}

// One of the big "pick a lane" entry points on Home — Korean Learning, Goal
// Setting, Progress, and Growth. The whole card deep-links via getLastVisited so it
// carries forward the same "continue where you left off" behavior the old
// ContinueCards had, just with a real-data summary instead of a bare label.
export function WorkspacePosterCard({
  href,
  eyebrow,
  title,
  description,
  icon: Icon,
  accentColor,
  stats,
  cta,
}: {
  href: string
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  accentColor: keyof typeof ACCENTS
  stats: WorkspacePosterStat[]
  cta: string
}) {
  const accent = ACCENTS[accentColor]

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card/90 p-4 shadow-sm shadow-slate-950/5 outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-950/8 focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-slate-900/70 sm:p-5",
        accent.border,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-[80px]",
          accent.glow,
        )}
      />

      <div className="relative z-10 flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              accent.iconBg,
            )}
          >
            <Icon size={20} />
          </div>
          <p className={cn("text-xs font-semibold uppercase tracking-wide", accent.eyebrow)}>
            {eyebrow}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        {stats.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-md border border-border/60 bg-background/55 px-3 py-2 dark:bg-white/5"
              >
                <p className="font-mono text-base font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-medium leading-4 text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "mt-auto flex min-h-11 items-center gap-1.5 text-sm font-semibold",
            accent.cta,
          )}
        >
          {cta}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  )
}
