"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  History,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Waves,
  Waypoints,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DailyCheckIn,
  ProtectionItem,
  RecoveryDashboardSummary,
  RecoveryHabit,
} from "@/lib/types"

type RelatedItem = { id: string; label: string }

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2026, 0, 1, hour))
}

export function RecoveryDashboard({
  target,
  targets,
  summary,
  checkIns,
  protectionItems,
  displayName,
  recoveryLockEnabled,
  goals,
  habits,
  onAddTarget,
  onSelectTarget,
}: {
  target: RecoveryHabit
  targets: RecoveryHabit[]
  summary: RecoveryDashboardSummary
  checkIns: DailyCheckIn[]
  protectionItems: ProtectionItem[]
  displayName?: string | null
  recoveryLockEnabled: boolean
  goals: RelatedItem[]
  habits: RelatedItem[]
  onAddTarget: () => void
  onSelectTarget: (id: string) => void
}) {
  const today = todayKey()
  const todaysCheckIns = checkIns.filter((checkIn) => checkIn.date === today)
  const latest = todaysCheckIns[0]
  const protection = protectionItems.find((item) => item.status === "active")
  const replacements = [
    ...(target.replacementBehavior
      ? [{ label: target.replacementBehavior, href: "/growth/recovery/urge" }]
      : []),
    ...goals
      .slice(0, 1)
      .map((goal) => ({ label: `Start five minutes of ${goal.label}`, href: "/goals" })),
    ...habits
      .slice(0, 1)
      .map((habit) => ({ label: `Complete ${habit.label}`, href: "/growth/habits" })),
    { label: "Review five vocabulary cards", href: "/vocab" },
    { label: "Practice one workplace Korean phrase", href: "/practice" },
    { label: "Take a ten-minute walk", href: "/growth/recovery/urge" },
  ]
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.label === item.label) === index,
    )
    .slice(0, 3)

  const metrics = [
    {
      label: "Current streak",
      value: `${summary.currentStreak}d`,
      icon: Activity,
      color: "text-orange-500",
    },
    {
      label: "Best streak",
      value: `${summary.bestStreak}d`,
      icon: History,
      color: "text-amber-500",
    },
    {
      label: "Recovery days",
      value: String(summary.recoveryDaysThisMonth),
      icon: CalendarCheck2,
      color: "text-emerald-500",
    },
    {
      label: "Urges managed",
      value: String(summary.urgesManaged),
      icon: Waves,
      color: "text-cyan-500",
    },
    {
      label: "Healthy actions",
      value: String(summary.healthyActionsCompleted),
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Check-in consistency",
      value: `${summary.checkInConsistency}%`,
      icon: ClipboardCheck,
      color: "text-sky-500",
    },
  ]

  const sections = [
    {
      href: "/growth/recovery/check-in",
      label: "Today",
      description: "Morning or evening check-in",
      icon: CalendarCheck2,
      color: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
    },
    {
      href: "/growth/recovery/urge",
      label: "Urge Rescue",
      description: "Pause, ground, and choose a next action",
      icon: Waves,
      color: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-400",
    },
    {
      href: "/growth/recovery/plan",
      label: "Recovery Plan",
      description: "When–Then plans and environment protection",
      icon: ListChecks,
      color: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
    },
    {
      href: "/growth/recovery/triggers",
      label: "Trigger Map",
      description: "Edit tags and understand patterns",
      icon: Waypoints,
      color: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
    },
    {
      href: "/growth/recovery/insights",
      label: "Progress & Insights",
      description: "Transparent, deterministic trends",
      icon: BarChart3,
      color: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
    },
    {
      href: "/growth/recovery/review",
      label: "Weekly Review",
      description: "Learn, adjust, and choose one experiment",
      icon: Lightbulb,
      color: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-400/10 dark:text-yellow-400",
    },
    {
      href: "/growth/recovery/settings",
      label: "Privacy Settings",
      description: "Lock, notifications, export, and delete",
      icon: Settings2,
      color: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/10 dark:text-slate-400",
    },
  ]

  return (
    <div className="space-y-6 pb-12 sm:space-y-7">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border border-primary/15 bg-slate-950 p-5 text-white shadow-sm sm:p-6"
      >
        <div
          className="absolute -right-16 -top-20 size-44 rounded-full bg-blue-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-300">
                Recovery workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                {greeting()}
                {displayName ? `, ${displayName.split(" ")[0]}` : ""}
              </h2>
            </div>
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70">
              {recoveryLockEnabled ? (
                <LockKeyhole size={14} aria-hidden="true" />
              ) : (
                <ShieldCheck size={14} aria-hidden="true" />
              )}
              {recoveryLockEnabled ? "Lock on" : "Private"}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            {target.recoveryStatement ||
              "Create space between a difficult moment and your next action."}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="h-11 bg-white text-slate-950 hover:bg-white/90 sm:min-w-48">
              <Link href="/growth/recovery/urge">
                <Waves size={18} aria-hidden="true" />I Have an Urge
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/growth/recovery/check-in">
                <CalendarCheck2 size={18} aria-hidden="true" />
                Check in
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <section aria-labelledby="recovery-metrics-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="app-kicker">More than a streak</p>
            <h2 id="recovery-metrics-title" className="mt-1 text-xl font-semibold">
              Recovery momentum
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/growth/recovery/${target.id}`}
              className="min-h-11 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Edit target
            </Link>
            <button
              type="button"
              onClick={onAddTarget}
              className="min-h-11 text-sm font-medium text-primary hover:underline"
            >
              Add target
            </button>
          </div>
        </div>
        {targets.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Recovery targets">
            {targets.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === target.id}
                onClick={() => onSelectTarget(item.id)}
                className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium ${item.id === target.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <dl className="grid grid-cols-2 sm:grid-cols-3">
            {metrics.map(({ label, value, icon: Icon, color }, index) => (
              <div
                key={label}
                className={`flex items-start justify-between gap-2 px-3 py-3 sm:px-4 ${
                  index % 2 !== 0 ? "border-l sm:border-l-0" : ""
                } ${index >= 2 ? "border-t" : ""} ${index % 3 !== 0 ? "sm:border-l" : ""}`}
              >
                <div>
                  <dd className="font-mono text-xl font-semibold tracking-tight">{value}</dd>
                  <dt className="mt-0.5 text-xs leading-4 text-muted-foreground">{label}</dt>
                </div>
                <Icon size={16} className={`mt-0.5 ${color}`} aria-hidden="true" />
              </div>
            ))}
          </dl>
          <div className="border-t border-border/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Recovery momentum</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  A transparent 7-day skill score. Honest reporting never subtracts points.
                </p>
              </div>
              <div className="shrink-0 font-mono text-2xl font-semibold text-primary">
                {summary.momentum}
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <details className="group">
              <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-primary">
                See the formula
              </summary>
              <div className="space-y-3 pt-2">
                {summary.momentumFactors.map((factor) => (
                  <div key={factor.key}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span>{factor.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {factor.points}/{factor.maximum}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(factor.points / factor.maximum) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                      {factor.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <div>
            <p className="app-kicker">Today</p>
            <CardTitle className="mt-1">Protect the day in front of you</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Mood</p>
              <p className="mt-1 text-sm font-medium">{latest?.mood || "Not checked in"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Urge level</p>
              <p className="mt-1 text-sm font-medium">
                {latest?.currentUrge ? `${latest.currentUrge}/10` : "Not checked in"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Protection</p>
              <p className="mt-1 text-sm font-medium">
                {protection?.label || latest?.protectionAction || "Choose one action"}
              </p>
            </div>
          </div>
          {latest?.intention && (
            <blockquote className="border-l-2 border-primary/40 pl-4 text-sm leading-6 text-muted-foreground">
              {latest.intention}
            </blockquote>
          )}
          <div>
            <p className="text-sm font-semibold">Three small replacement actions</p>
            <div className="mt-2 space-y-2">
              {replacements.map((action, index) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-sm transition-colors hover:bg-accent/50"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">{action.label}</span>
                  <ArrowRight size={15} className="text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          {(goals.length > 0 || habits.length > 0) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Connected Hengo goals & habits
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {goals.slice(0, 2).map((goal) => (
                  <span
                    key={goal.id}
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    <Target size={12} className="mr-1.5 inline text-primary" />
                    {goal.label}
                  </span>
                ))}
                {habits.slice(0, 3).map((habit) => (
                  <span
                    key={habit.id}
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    <HeartHandshake size={12} className="mr-1.5 inline text-primary" />
                    {habit.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {summary.highestRiskWindow && (
        <div className="flex gap-3 rounded-lg border border-border/70 bg-card p-4 text-sm">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="leading-6 text-muted-foreground">
            Your most recorded two-hour window is{" "}
            <span className="font-semibold text-foreground">
              {hourLabel(summary.highestRiskWindow.startHour)}–
              {hourLabel(summary.highestRiskWindow.endHour)}
            </span>
            . This is a pattern in your records, not a medical conclusion.
          </p>
        </div>
      )}

      <section aria-labelledby="recovery-tools-title">
        <p className="app-kicker">Recovery tools</p>
        <h2 id="recovery-tools-title" className="mt-1 text-xl font-semibold">
          Use the right tool for the moment
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sections.map(({ href, label, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-20 items-center gap-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
              <ArrowRight
                size={16}
                className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
