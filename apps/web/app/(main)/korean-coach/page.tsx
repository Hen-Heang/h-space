"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpenCheck, Drama, Flame, Headphones, Mic, Settings2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { Badge } from "@/components/ui/badge"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { getApiErrorMessage, koreanCoachApi, type KoreanCoachDashboard } from "@/lib/api"

// Korean Coach leads with one recommended scenario and one CTA — "Start
// speaking" — so reaching speaking practice takes about one tap. Stats,
// the full recent-session list, and account-management actions (delete
// history) moved to /korean-coach/history and /korean-coach/preferences;
// see docs/HENGO_SMART_LEARNING_PLAN.md for the reasoning.
export default function KoreanCoachDashboardPage() {
  return (
    <div className="space-y-5">
      <WorkspaceTabs sectionId="learn" />
      <KoreanCoachDashboard />
    </div>
  )
}

function KoreanCoachDashboard() {
  useSessionTimer("korean_coach")
  const [dashboard, setDashboard] = useState<KoreanCoachDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    koreanCoachApi
      .getDashboard()
      .then((data) => {
        if (active) setDashboard(data)
      })
      .catch((cause) => {
        if (active) {
          setError(
            getApiErrorMessage(
              cause,
              "Korean Coach could not load. Apply the latest Supabase migration, then try again.",
            ),
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5" aria-label="Loading Korean Coach">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-11 w-64 rounded-full" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-accent"
        >
          Try again
        </button>
      </div>
    )
  }

  const scenario = dashboard.recommendedScenario
  const whyThis = scenario.learningObjectives.slice(0, 2)
  const mistakeCount = dashboard.frequentMistakes.length

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-14">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Korean Coach</h2>
        <Link
          href="/korean-coach/preferences"
          aria-label="Korean Coach preferences"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        >
          <Settings2 size={18} strokeWidth={2.2} />
        </Link>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.07] via-card to-card p-6 shadow-sm dark:from-rose-500/[0.1] dark:via-slate-900/60 dark:to-slate-900/60 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-400">
          Recommended for you
        </p>
        <p lang="ko" className="mt-3 text-2xl font-bold leading-snug text-foreground">
          {scenario.koreanTitle}
        </p>
        <p className="mt-1 text-base font-medium text-muted-foreground">{scenario.englishTitle}</p>

        {whyThis.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {whyThis.map((reason) => (
              <Badge key={reason} variant="outline">
                {reason}
              </Badge>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs font-semibold text-muted-foreground">
          {scenario.category === "workplace" ? "Workplace Korean" : "Daily Korean"} ·{" "}
          {scenario.estimatedMinutes} min
        </p>

        <Link
          href={`/korean-coach/practice/${scenario.id}`}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-sm shadow-rose-600/20 transition-colors hover:bg-rose-500 active:scale-[0.985] dark:bg-rose-500 dark:hover:bg-rose-400"
        >
          <Mic size={16} strokeWidth={2.2} />
          Start speaking
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <CompactLink href="/korean-coach/scenarios" icon={Drama} label="Other scenarios" />
        <CompactLink href="/listening" icon={Headphones} label="Listening" />
        <CompactLink
          href="/korean-coach/mistakes"
          icon={BookOpenCheck}
          label="Review mistakes"
          badge={mistakeCount > 0 ? mistakeCount : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        {dashboard.streak > 0 ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Flame size={13} className="shrink-0 text-orange-500" />
            {dashboard.streak} day streak
          </p>
        ) : (
          <span />
        )}
        <Link
          href="/korean-coach/history"
          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Past sessions
        </Link>
      </div>
    </div>
  )
}

function CompactLink({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string
  icon: LucideIcon
  label: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm outline-none transition-colors hover:border-rose-500/35 focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-slate-900/40"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <Icon size={13} strokeWidth={2.2} />
      </span>
      {label}
      {badge != null && (
        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
          {badge}
        </span>
      )}
    </Link>
  )
}
