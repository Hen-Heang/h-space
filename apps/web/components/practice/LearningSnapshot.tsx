"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { BookOpenText, GraduationCap, Headphones, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { achievementsApi, listeningApi } from "@/lib/api"
import { loadScorecards } from "@/lib/interview-history"
import {
  getReadingProgress,
  getReadingProgressServerSnapshot,
  subscribeReadingProgress,
} from "@/lib/reading-progress-store"
import {
  getAllReadingUnits,
  getReadingUnitsServerSnapshot,
  isReadingUnitsLoaded,
  loadReadingUnits,
  subscribeReadingUnits,
} from "@/lib/reading-store"
import { cn } from "@/lib/utils"
import type { Achievement, ListeningAttemptRecord, ListeningLesson } from "@/lib/types"

function Tile({
  icon: Icon,
  iconClass,
  eyebrow,
  title,
  detail,
  href,
}: {
  icon: LucideIcon
  iconClass: string
  eyebrow: string
  title: string
  detail: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-blue-500/40 dark:bg-slate-900/40"
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconClass)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground/70">{detail}</p>
      </div>
    </Link>
  )
}

// A cross-feature snapshot for the Learning workspace's dashboard (Today) —
// reading/listening/exam-prep progress and the most recent achievement, so
// users don't have to visit each page to know where they stand.
export function LearningSnapshot() {
  const readingProgress = useSyncExternalStore(
    subscribeReadingProgress,
    getReadingProgress,
    getReadingProgressServerSnapshot,
  )
  const readingUnits = useSyncExternalStore(
    subscribeReadingUnits,
    getAllReadingUnits,
    getReadingUnitsServerSnapshot,
  )

  const [listeningLessons, setListeningLessons] = useState<ListeningLesson[] | null>(null)
  const [listeningAttempts, setListeningAttempts] = useState<ListeningAttemptRecord[] | null>(null)
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null | undefined>(
    undefined,
  )
  const [scorecardCount] = useState(() => loadScorecards().length)
  const [latestScore] = useState(() => {
    const history = loadScorecards()
    return history.length > 0 ? history[history.length - 1].overall : null
  })

  useEffect(() => {
    if (!isReadingUnitsLoaded()) void loadReadingUnits().catch(() => undefined)
  }, [])

  useEffect(() => {
    let active = true
    listeningApi
      .getLessons()
      .then((lessons) => active && setListeningLessons(lessons))
      .catch(() => active && setListeningLessons([]))
    listeningApi
      .getAttempts()
      .then((attempts) => active && setListeningAttempts(attempts))
      .catch(() => active && setListeningAttempts([]))
    achievementsApi
      .getSummary()
      .then((summary) => {
        if (!active) return
        const unlocked = summary.achievements
          .filter((a) => a.unlocked && a.unlockedAt)
          .sort((a, b) => (b.unlockedAt! < a.unlockedAt! ? -1 : 1))
        setRecentAchievement(unlocked[0] ?? null)
      })
      .catch(() => active && setRecentAchievement(null))
    return () => {
      active = false
    }
  }, [])

  const readingCompleted = useMemo(
    () => readingUnits.filter((u) => readingProgress[u.id]?.status === "completed").length,
    [readingUnits, readingProgress],
  )

  const listeningAvgAccuracy = useMemo(() => {
    if (!listeningAttempts || listeningAttempts.length === 0) return null
    return Math.round(
      listeningAttempts.reduce((sum, a) => sum + a.accuracy, 0) / listeningAttempts.length,
    )
  }, [listeningAttempts])

  const ready =
    listeningLessons !== null && listeningAttempts !== null && recentAchievement !== undefined

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={BookOpenText}
        iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        eyebrow="Reading"
        title={
          readingUnits.length > 0
            ? `${readingCompleted}/${readingUnits.length} units`
            : "No units yet"
        }
        detail={readingCompleted > 0 ? "Keep reading to finish the set" : "Start your first unit"}
        href="/phrasebook?mode=reading"
      />
      <Tile
        icon={Headphones}
        iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        eyebrow="Listening"
        title={
          listeningAttempts && listeningAttempts.length > 0
            ? `${listeningAvgAccuracy}% accuracy`
            : "No attempts yet"
        }
        detail={
          listeningAttempts && listeningAttempts.length > 0
            ? `${listeningAttempts.length} attempt${listeningAttempts.length === 1 ? "" : "s"} · ${listeningLessons?.length ?? 0} lessons`
            : "Try a listening passage"
        }
        href="/listening"
      />
      <Tile
        icon={GraduationCap}
        iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        eyebrow="Exam Prep"
        title={latestScore !== null ? `Last score ${latestScore}/5` : "No mocks yet"}
        detail={
          scorecardCount > 0
            ? `${scorecardCount} mock${scorecardCount === 1 ? "" : "s"} scored`
            : "Try a mock interview"
        }
        href="/interview"
      />
      <Tile
        icon={Trophy}
        iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        eyebrow="Achievements"
        title={recentAchievement ? recentAchievement.title : "None unlocked yet"}
        detail={
          recentAchievement ? `+${recentAchievement.xp} XP earned` : "Keep practicing to unlock one"
        }
        href="/achievements"
      />
    </div>
  )
}
