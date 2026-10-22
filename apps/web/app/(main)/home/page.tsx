"use client"

import Link from "next/link"
import { motion, type Variants } from "motion/react"
import { BookOpen, BrainCircuit, Flame, GraduationCap, Mic, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { ActiveGoalsCard } from "@/components/home/ActiveGoalsCard"
import { ContinueCard } from "@/components/home/ContinueCard"
import { MyAppsSection } from "@/components/home/MyAppsSection"
import { TodayHabitCheckins } from "@/components/home/TodayHabitCheckins"
import { TodayMissionCard } from "@/components/home/TodayMissionCard"
import { TodayTasksCard } from "@/components/home/TodayTasksCard"
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useStreak } from "@/hooks/useStreak"
import { getLastVisited } from "@/lib/last-visited"
import { askHengoItem } from "@/lib/navigation"
import { openQuickCapture } from "@/lib/quick-capture-bus"
import { cn } from "@/lib/utils"

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

// ─── Learning shortcuts (Add a word / Continue study / Speak with Coach) ─────
//
// Compact pills under TodayMissionCard — reachable, but never competing with
// "Start today's practice" for attention.

type ShortcutTone = "vocab" | "study" | "coach"

type Shortcut = {
  href: string
  label: string
  icon: LucideIcon
  tone: ShortcutTone
}

const shortcutStyles: Record<ShortcutTone, { icon: string; border: string }> = {
  vocab: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "hover:border-emerald-500/35",
  },
  study: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "hover:border-amber-500/35",
  },
  coach: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "hover:border-rose-500/35",
  },
}

function SecondaryShortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {shortcuts.map((s) => {
        const style = shortcutStyles[s.tone]
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-slate-900/40",
              style.border,
            )}
          >
            <span
              className={cn("flex size-6 items-center justify-center rounded-full", style.icon)}
            >
              <s.icon size={13} strokeWidth={2.2} />
            </span>
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
    >
      {children}
    </h2>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
//
// The private daily dashboard: tasks and goals first, learning and context in
// the side column, the app catalog last. Every card reads an existing query
// cache — no dashboard-specific endpoint or table.

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()

  // "Continue study" deep-links into whatever the learner was doing under
  // /learn — Coach already owns its own shortcut, so fall back to the hub
  // instead of duplicating that href if the last "learn" visit was Coach.
  const lastLearnHref = getLastVisited("learn", "/learn")
  const continueStudyHref = lastLearnHref.startsWith("/korean-coach") ? "/learn" : lastLearnHref

  const shortcuts: Shortcut[] = [
    { href: "/vocab", label: "Add a word", icon: BookOpen, tone: "vocab" },
    { href: continueStudyHref, label: "Continue study", icon: GraduationCap, tone: "study" },
    { href: "/korean-coach", label: "Speak with Coach", icon: Mic, tone: "coach" },
  ]

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:space-y-8 sm:px-6 sm:pt-6 lg:px-8"
    >
      <motion.header
        variants={fadeUp}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
            {getTodayLabel()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            {getGreeting()}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openQuickCapture}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Quick capture
          </button>
          <Link
            href={askHengoItem.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-slate-900/40"
          >
            <BrainCircuit size={16} className="text-sky-500" aria-hidden="true" />
            {askHengoItem.label}
          </Link>
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.section
          variants={fadeUp}
          aria-labelledby="today-priorities-title"
          className="space-y-3 lg:col-span-2"
        >
          <SectionLabel id="today-priorities-title">Priorities</SectionLabel>
          <TodayTasksCard />
          <ActiveGoalsCard />
        </motion.section>

        <motion.section
          variants={fadeUp}
          aria-labelledby="today-context-title"
          className="space-y-3"
        >
          <SectionLabel id="today-context-title">Today</SectionLabel>
          <UpcomingEventsCard />
          <ContinueCard />
          <TodayHabitCheckins />
        </motion.section>
      </div>

      <motion.section
        variants={fadeUp}
        aria-labelledby="hengo-learning-title"
        className="space-y-3"
      >
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2
            id="hengo-learning-title"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Daily learning · Hengo
          </h2>
          {streakDays != null && streakDays > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Flame size={13} className="shrink-0 text-orange-500" aria-hidden="true" />
              {streakDays} day streak
            </p>
          )}
        </div>
        <TodayMissionCard mission={mission} loading={missionLoading} error={missionError} />
        <SecondaryShortcuts shortcuts={shortcuts} />
      </motion.section>

      <motion.div variants={fadeUp}>
        <MyAppsSection compact />
      </motion.div>
    </motion.div>
  )
}
