"use client"

import Link from "next/link"
import { ClipboardList, History, Waypoints, Wind, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { EditHabitDialog } from "@/components/recovery/EditHabitDialog"
import { LiveElapsedClock } from "@/components/recovery/LiveElapsedClock"
import type { RecoveryHabit, TrackingMode } from "@/lib/types"

// Headline is always daysSinceLastEvent (the one metric that would have
// caught a long silent gap) — never the streak. See lib/recovery.ts. Below the
// quiet-gap threshold, it's shown as a live-ticking clock (days:hrs:min:sec);
// above it, the exact count is deliberately dropped for calmer "welcome back"
// copy — a large ticking number for a long-neglected habit reads as guilt,
// which is exactly what this module is designed against.
const QUIET_GAP_DAYS = 3

export function RecoveryOverview({
  habit,
  daysSinceLastEvent,
  lastEventAt,
  rodeOutCount,
  streakDays,
  checkinsCount,
  plansCount,
  duePlansCount,
  triggersCount,
  onUpdateHabit,
  onDeleteHabit,
}: {
  habit: RecoveryHabit
  daysSinceLastEvent: number | null
  lastEventAt: string | null
  rodeOutCount: number
  streakDays: number
  checkinsCount: number
  plansCount: number
  duePlansCount: number
  triggersCount: number
  onUpdateHabit: (data: {
    label: string
    replacementBehavior?: string | null
    recoveryStatement?: string | null
    trackingMode?: TrackingMode
  }) => Promise<unknown>
  onDeleteHabit: () => Promise<unknown>
}) {
  const neverLogged = daysSinceLastEvent === null
  const isQuietGap = daysSinceLastEvent !== null && daysSinceLastEvent > QUIET_GAP_DAYS

  const sections: {
    href: string
    label: string
    icon: React.ElementType
    count: number
    due?: number
  }[] = [
    {
      href: `/growth/recovery/checkins?habitId=${habit.id}`,
      label: "Check-ins",
      icon: History,
      count: checkinsCount,
    },
    {
      href: `/growth/recovery/plans?habitId=${habit.id}`,
      label: "Plans",
      icon: ClipboardList,
      count: plansCount,
      due: duePlansCount,
    },
    { href: "/growth/recovery/triggers", label: "Triggers", icon: Waypoints, count: triggersCount },
  ]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <BlurFade>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">{habit.label}</p>
            <EditHabitDialog habit={habit} onUpdate={onUpdateHabit} onDelete={onDeleteHabit} />
          </div>

          {neverLogged ? (
            <>
              <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Ready when you are
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Log a moment whenever something comes up — there&apos;s nothing to catch up on.
              </p>
            </>
          ) : isQuietGap ? (
            <>
              <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Welcome back</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing to catch up on — just log where you are now.
              </p>
            </>
          ) : (
            <>
              {lastEventAt && (
                <div className="mt-5">
                  <LiveElapsedClock since={lastEventAt} />
                </div>
              )}
              <p className="mt-3 text-sm text-muted-foreground">since your last check-in</p>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground">
              {rodeOutCount} ridden out
            </div>
            {/* Streak: small chip only, never the headline, never celebrated. */}
            <div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              {streakDays}d streak
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:flex-1">
            <Link href="/growth/recovery/pause">
              <Wind size={18} strokeWidth={2} />
              Pause
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:flex-1">
            <Link href={`/growth/recovery/log?habitId=${habit.id}`}>
              <Zap size={18} strokeWidth={2} />
              Log a moment
            </Link>
          </Button>
        </div>
      </BlurFade>

      {/* Check-ins / Plans / Triggers were previously unreachable from the UI
          (URL-only) — this row is the overview's way into them. */}
      <BlurFade delay={0.2}>
        <div className="grid grid-cols-3 gap-2">
          {sections.map(({ href, label, icon: Icon, count, due }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 outline-none transition-all hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/70 active:scale-[0.98]"
            >
              {/* The "due" badge sits in the row beside the icon; absolutely
                  positioned, it overlapped the count on narrow cards. */}
              <div className="flex min-h-5 items-center justify-between gap-1">
                <Icon
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform group-hover:scale-110"
                />
                {due != null && due > 0 && (
                  <span className="truncate rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {due} due
                  </span>
                )}
              </div>
              <div>
                <NumberTicker
                  value={count}
                  className="text-lg font-bold tracking-normal text-foreground"
                />
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </BlurFade>
    </div>
  )
}
