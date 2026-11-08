"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Blocks,
  BookOpen,
  CheckCheck,
  Flame,
  GraduationCap,
  Library,
  Lock,
  MessagesSquare,
  Sparkles,
  Trophy,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHero } from "@/components/app/page-hero"
import { CardGrid } from "@/components/ui/card-grid"
import { TipCard } from "@/components/app/tip-card"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { Confetti, type ConfettiRef } from "@/components/ui/confetti"
import { achievementsApi, getApiErrorMessage } from "@/lib/api"
import { staggerContainer, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { Achievement, AchievementSummary } from "@/lib/types"

const containerVariants = staggerContainer(0.06)

// Keyed by the exact lucide export name used in the achievement catalog
// (lib/api/progress.ts CATALOG) — keep these in sync.
const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Library,
  GraduationCap,
  MessagesSquare,
  Flame,
  Trophy,
  CheckCheck,
  Blocks,
}

const CELEBRATION_KEY = "hengo:last-celebrated-achievement"

function AchievementCelebration({ achievement }: { achievement: Achievement | null }) {
  const confettiRef = useRef<ConfettiRef>(null)
  const achievementKey = achievement
    ? `${achievement.code}:${achievement.unlockedAt ?? "unlocked"}`
    : null

  useEffect(() => {
    if (!achievementKey) return

    try {
      if (window.localStorage.getItem(CELEBRATION_KEY) === achievementKey) return
      window.localStorage.setItem(CELEBRATION_KEY, achievementKey)
    } catch {
      // Celebration is optional when storage is unavailable.
    }

    const timer = window.setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 70,
        spread: 72,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.22 },
        colors: ["#10b981", "#14b8a6", "#3b82f6", "#f59e0b"],
      })
    }, 280)

    return () => window.clearTimeout(timer)
  }, [achievementKey])

  return (
    <Confetti
      ref={confettiRef}
      manualstart
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  )
}

export default function AchievementsPage() {
  const [summary, setSummary] = useState<AchievementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    achievementsApi
      .getSummary()
      .then((data) => {
        if (active) setSummary(data)
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, "Could not load achievements."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const level = summary?.level
  const nextPct =
    level && level.xpForNextLevel && level.xpForNextLevel > 0
      ? Math.min(100, Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100))
      : 100
  const newestUnlocked =
    summary?.achievements.reduce<Achievement | null>((latest, achievement) => {
      if (!achievement.unlocked) return latest
      if (!latest) return achievement

      const latestAt = new Date(latest.unlockedAt ?? 0).getTime()
      const achievementAt = new Date(achievement.unlockedAt ?? 0).getTime()
      return achievementAt > latestAt ? achievement : latest
    }, null) ?? null

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-12 sm:space-y-7"
    >
      <AchievementCelebration achievement={newestUnlocked} />

      <motion.div variants={itemVariants}>
        <PageHero
          eyebrow="Achievements"
          title="Your Progress & XP"
          description="Earn XP and unlock badges as you build a daily Korean habit, grow your vocabulary, and master workplace communication."
          stats={[
            { label: "Total XP", value: level ? `${level.totalXp}` : "—" },
            {
              label: "Unlocked",
              value: summary ? `${summary.unlockedCount}/${summary.totalCount}` : "—",
            },
          ]}
        />
      </motion.div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <>
          <Skeleton className="h-28 w-full rounded-lg" />
          <CardGrid minCardWidth={220}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </CardGrid>
        </>
      ) : summary ? (
        <>
          {/* Level progress */}
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <Trophy size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Level {level?.level}</p>
                  <h3 className="text-lg font-semibold text-foreground">{level?.name}</h3>
                </div>
              </div>
              <AnimatedCircularProgressBar
                value={nextPct}
                gaugePrimaryColor="var(--primary)"
                gaugeSecondaryColor="var(--muted)"
                label="Progress toward the next level"
                className="size-20 shrink-0 font-mono text-sm"
              />
            </div>

            <div className="mt-5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${nextPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {level?.xpForNextLevel
                  ? `${level.xpIntoLevel} / ${level.xpForNextLevel} XP toward ${level.nextLevelName}`
                  : "Max level reached — you're a Master!"}
              </p>
            </div>
          </motion.div>

          {/* Badge grid */}
          <motion.div variants={itemVariants}>
            <CardGrid minCardWidth={220}>
              {summary.achievements.map((a, index) => {
                const Icon = ICONS[a.icon] ?? Trophy
                return (
                  <BlurFade
                    key={a.code}
                    inView
                    delay={Math.min(index * 0.035, 0.25)}
                    className="h-full"
                  >
                    <div
                      className={cn(
                        "relative h-full overflow-hidden rounded-lg border p-4 transition-colors",
                        a.unlocked
                          ? "border-emerald-500/30 bg-emerald-500/5 shadow-sm"
                          : "border-border bg-card/40 dark:bg-slate-900/20",
                      )}
                    >
                      {a.code === newestUnlocked?.code ? (
                        <BorderBeam size={70} duration={7} colorFrom="#10b981" colorTo="#3b82f6" />
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            a.unlocked
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground/50",
                          )}
                        >
                          {a.unlocked ? <Icon size={22} /> : <Lock size={20} />}
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            a.unlocked
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground/70",
                          )}
                        >
                          +{a.xp} XP
                        </span>
                      </div>
                      <h4
                        className={cn(
                          "mt-3 text-base font-semibold",
                          a.unlocked ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {a.title}
                      </h4>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {a.description}
                      </p>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">{a.category}</p>
                    </div>
                  </BlurFade>
                )
              })}
            </CardGrid>
          </motion.div>

          <motion.div variants={itemVariants}>
            <TipCard icon={Sparkles} title="Keep the streak alive">
              Every correction, diary entry, chat, saved word, and listening lesson earns progress
              toward your next badge. Show up daily to climb the levels.
            </TipCard>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  )
}
