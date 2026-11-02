"use client"

import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { BookOpenText, ChevronRight, Loader2, Pin, Plus, RotateCw } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { CourseProgress } from "@/components/learn/CourseProgress"
import { LearnHeader } from "@/components/learn/LearnHeader"
import { StatusBadge } from "@/components/learn/StatusBadge"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiErrorMessage } from "@/lib/api"
import { continueReadingUnit, readingStatus } from "@/lib/learning/course"
import { READING_CATEGORIES, type ReadingCategory } from "@/lib/reading"
import {
  getReadingProgress,
  getReadingProgressServerSnapshot,
  subscribeReadingProgress,
  toggleUnitPinned,
} from "@/lib/reading-progress-store"
import {
  getAllReadingUnits,
  getReadingUnitsServerSnapshot,
  isReadingUnitsLoaded,
  loadReadingUnits,
  subscribeReadingUnits,
} from "@/lib/reading-store"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} as const

const CATEGORY_ORDER: ReadingCategory[] = ["DAILY_LIFE", "CULTURE", "BEGINNER_STORY"]

export function ReadingHome() {
  const progress = useSyncExternalStore(
    subscribeReadingProgress,
    getReadingProgress,
    getReadingProgressServerSnapshot,
  )
  const units = useSyncExternalStore(
    subscribeReadingUnits,
    getAllReadingUnits,
    getReadingUnitsServerSnapshot,
  )

  const [loaded, setLoaded] = useState(isReadingUnitsLoaded())
  const [loadError, setLoadError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    loadReadingUnits()
      .then(() => active && setLoadError(""))
      .catch(
        (err) => active && setLoadError(getApiErrorMessage(err, "Could not load reading units.")),
      )
      .finally(() => active && setLoaded(true))
    return () => {
      active = false
    }
  }, [attempt])

  const completedCount = units.filter((u) => progress[u.id]?.status === "completed").length
  const upNext = continueReadingUnit(units, progress)
  const [pinningId, setPinningId] = useState<string | null>(null)

  async function handleTogglePin(unitId: string) {
    if (pinningId) return
    setPinningId(unitId)
    try {
      const pinned = await toggleUnitPinned(unitId)
      toast.success(pinned ? "Pinned to the top." : "Unpinned.")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the pin."))
    } finally {
      setPinningId(null)
    }
  }

  const newUnitButton = (
    <Button asChild>
      <Link href="/reading/new">
        <Plus aria-hidden="true" /> New unit
      </Link>
    </Button>
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <LearnHeader
          description="Real Korean articles, transcripts, and stories. Read with tap-to-look-up and audio, save the vocabulary, then pass the quiz to complete each unit."
          actions={newUnitButton}
        />
      </motion.div>

      {loadError && (
        <motion.div variants={itemVariants} className="space-y-3">
          <ErrorBanner>{loadError}</ErrorBanner>
          <Button
            variant="outline"
            onClick={() => {
              setLoadError("")
              setAttempt((n) => n + 1)
            }}
          >
            <RotateCw aria-hidden="true" /> Try again
          </Button>
        </motion.div>
      )}

      {!loadError && !loaded && units.length === 0 && (
        <div role="status" aria-label="Loading reading units" className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}

      {!loadError && loaded && units.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 text-center"
        >
          <BookOpenText aria-hidden="true" size={28} className="text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No reading units yet.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Add your first text — paste an article, podcast transcript, or message to study.
          </p>
          {newUnitButton}
        </motion.div>
      )}

      {units.length > 0 && (
        <motion.div variants={itemVariants}>
          <CourseProgress
            title="Reading units"
            completed={completedCount}
            total={units.length}
            continueHref={upNext ? `/reading/${upNext.id}` : undefined}
            continueLabel={upNext ? upNext.title : undefined}
          />
        </motion.div>
      )}

      {CATEGORY_ORDER.map((category) => {
        // Pinned units float to the top of their category; ties keep the
        // original (created_at) order thanks to the stable sort.
        const categoryUnits = units
          .filter((u) => u.category === category)
          .sort(
            (a, b) =>
              Number(Boolean(progress[b.id]?.pinned)) - Number(Boolean(progress[a.id]?.pinned)),
          )
        if (categoryUnits.length === 0) return null
        const done = categoryUnits.filter((u) => progress[u.id]?.status === "completed").length

        return (
          <motion.section
            key={category}
            variants={itemVariants}
            aria-labelledby={`reading-${category}`}
            className="space-y-3"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 id={`reading-${category}`} className="text-base font-semibold text-foreground">
                  {READING_CATEGORIES[category].label}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {READING_CATEGORIES[category].description}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {done} of {categoryUnits.length} done
              </span>
            </div>

            <ul className="app-surface divide-y divide-border">
              {categoryUnits.map((unit) => {
                const entry = progress[unit.id]
                const pinned = Boolean(entry?.pinned)
                return (
                  // The link and the pin are siblings — a button inside a link
                  // is invalid and confuses keyboard and screen-reader users.
                  <li key={unit.id} className="flex items-center gap-1 pr-2">
                    <Link
                      href={`/reading/${unit.id}`}
                      className="group flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          lang="ko"
                          className="block truncate text-base font-semibold text-foreground"
                        >
                          {unit.episode ? `${unit.episode} · ` : ""}
                          {unit.title}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {unit.titleEnglish}
                        </span>
                        {unit.summary && (
                          <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {unit.summary}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <StatusBadge status={readingStatus(entry)} />
                          <span>{unit.level}</span>
                          <span>{unit.vocab.length} words</span>
                          <span>{unit.quiz.length} questions</span>
                          {typeof entry?.quizScore === "number" && (
                            <span>
                              Quiz {entry.quizScore}/{entry.quizTotal}
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleTogglePin(unit.id)}
                      disabled={pinningId === unit.id}
                      aria-pressed={pinned}
                      aria-label={pinned ? `Unpin ${unit.title}` : `Pin ${unit.title} to the top`}
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                        pinned
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {pinningId === unit.id ? (
                        <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                      ) : (
                        <Pin
                          aria-hidden="true"
                          size={16}
                          className={cn(pinned && "fill-current")}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.section>
        )
      })}
    </motion.div>
  )
}
