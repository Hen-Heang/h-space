"use client"

import Link from "next/link"
import { motion, type Variants } from "motion/react"
import { BookOpen, Flame, GraduationCap, Mic } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { TodayMissionCard } from "@/components/home/TodayMissionCard"
import { AboutHSpace } from "@/components/home/AboutHSpace"
import { MyAppsSection } from "@/components/home/MyAppsSection"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useStreak } from "@/hooks/useStreak"
import { getLastVisited } from "@/lib/last-visited"
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

// ─── Secondary shortcuts (Add a word / Continue study / Speak with Coach) ────
//
// Demoted to compact pills, deliberately smaller and lower on the page than
// TodayMissionCard above — these routes stay reachable but must not compete
// with "Start today's practice" for attention.

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
    <motion.div variants={staggerContainer} className="flex flex-wrap gap-2">
      {shortcuts.map((s) => {
        const style = shortcutStyles[s.tone]
        return (
          <motion.div key={s.href} variants={fadeUp}>
            <Link
              href={s.href}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-slate-900/40",
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
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()

  // "Continue Study" deep-links into whatever the learner was doing under
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
      className="mx-auto max-w-6xl space-y-8 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:space-y-10 sm:px-6 sm:pt-6 lg:px-8"
    >
      <motion.header
        variants={fadeUp}
        className="rounded-3xl border border-border bg-gradient-to-br from-blue-500/10 via-background to-indigo-500/5 p-6 shadow-sm sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          My Projects. One Space.
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
          {getGreeting()} from H-Space{" "}
          <motion.span
            className="inline-block origin-[70%_70%]"
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
            transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }}
          >
            👋
          </motion.span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {getTodayLabel()} · A personal workspace for learning, finance, AI engineering,
          productivity, and the software I build.
        </p>
      </motion.header>

      <motion.section
        variants={fadeUp}
        aria-labelledby="hengo-learning-title"
        className="space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            Everyday learning
          </p>
          <h2 id="hengo-learning-title" className="mt-1 text-xl font-semibold text-foreground">
            Hengo Learning
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue your Korean practice without leaving the H-Space dashboard.
          </p>
        </div>

        <TodayMissionCard mission={mission} loading={missionLoading} error={missionError} />
        <SecondaryShortcuts shortcuts={shortcuts} />

        {streakDays != null && streakDays > 0 && (
          <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
            <Flame size={13} className="shrink-0 text-orange-500" />
            {streakDays} day streak
          </p>
        )}
      </motion.section>

      <motion.div variants={fadeUp}>
        <MyAppsSection />
      </motion.div>

      <motion.div variants={fadeUp}>
        <AboutHSpace />
      </motion.div>
    </motion.div>
  )
}
