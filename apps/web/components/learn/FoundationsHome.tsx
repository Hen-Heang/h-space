"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { ChevronRight, Clock, LifeBuoy, SpellCheck2, Type, BookOpen } from "lucide-react"

import { CourseProgress } from "@/components/learn/CourseProgress"
import { LearnHeader } from "@/components/learn/LearnHeader"
import { StatusBadge } from "@/components/learn/StatusBadge"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useBrowserStorage } from "@/hooks/useBrowserStorage"
import { useFoundationsLessons } from "@/hooks/useFoundations"
import { seedLessonsByTrack } from "@/lib/foundations-curriculum"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { lessonStatus, nextIncompleteLesson } from "@/lib/learning/course"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LearnTrack } from "@/lib/types"
import { EmptyState } from "@/components/ui/empty-state"

const TRACKS: Array<{
  key: LearnTrack
  label: string
  icon: typeof Type
  blurb: string
  count: number
}> = [
  {
    key: "survival",
    label: "Survival",
    icon: LifeBuoy,
    blurb: "Phrases for your first day",
    count: seedLessonsByTrack("survival").length,
  },
  {
    key: "alphabet",
    label: "Alphabet",
    icon: Type,
    blurb: "Read & write Hangul from zero",
    count: seedLessonsByTrack("alphabet").length,
  },
  {
    key: "grammar",
    label: "Grammar",
    icon: SpellCheck2,
    blurb: "Core grammar for daily life & work",
    count: seedLessonsByTrack("grammar").length,
  },
]

// The open track survives the round trip into a lesson and back (the URL stays
// /phrasebook?mode=foundations). Per tab, per visit — a convenience only.
const TRACK_KEY = "koriai-foundations-track"

function isTrack(value: string | null): value is LearnTrack {
  return TRACKS.some((t) => t.key === value)
}

/**
 * Korean Foundations — lesson tracks (Survival / Alphabet / Grammar) with
 * per-lesson progress. Rendered as the "Foundations" mode of the merged
 * Phrasebook hub (`/phrasebook?mode=foundations`).
 */
export function FoundationsHome() {
  useSessionTimer("foundations")
  const [storedTrack, writeTrack] = useBrowserStorage("session", TRACK_KEY)
  const track: LearnTrack = isTrack(storedTrack) ? storedTrack : "survival"
  const { lessons, loading, error } = useFoundationsLessons(track)
  // Framer's stagger/slide-in entrance isn't covered by the sitewide
  // prefers-reduced-motion CSS rule (that only catches CSS transitions), so
  // it's opted out explicitly here — content just appears, no motion.
  const reduceMotion = useReducedMotion()
  const container = reduceMotion ? undefined : containerVariants
  const item = reduceMotion ? undefined : itemVariants

  const chooseTrack = (next: LearnTrack) => writeTrack(next)

  const completedCount = lessons.filter((l) => l.completed).length
  const upNext = nextIncompleteLesson(lessons)
  const trackLabel = TRACKS.find((t) => t.key === track)?.label ?? "Track"

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={container}
      className="space-y-6 pb-12"
    >
      <motion.div variants={item}>
        <LearnHeader description="Start from the beginning, then build the core Korean you need for daily life and work — Hangul, sentence structure, numbers, time, honorifics, and grammar." />
      </motion.div>

      {/* Track toggle */}
      <motion.div
        variants={item}
        role="group"
        aria-label="Foundations track"
        className="grid gap-2 sm:grid-cols-3"
      >
        {TRACKS.map(({ key, label, icon: Icon, blurb, count }) => {
          const active = track === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => chooseTrack(key)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{count} lessons</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{blurb}</span>
              </span>
            </button>
          )
        })}
      </motion.div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <EmptyState
          surface
          icon={BookOpen}
          title="No lessons in this track yet"
          description="More lessons are on the way."
        />
      ) : (
        <>
          <motion.div variants={item}>
            <CourseProgress
              title={`${trackLabel} track`}
              completed={completedCount}
              total={lessons.length}
              continueHref={upNext ? `/learn/${upNext.id}` : undefined}
              continueLabel={upNext ? `Lesson ${upNext.order}: ${upNext.title}` : undefined}
            />
          </motion.div>

          <motion.ol variants={container} className="app-surface divide-y divide-border">
            {lessons.map((lesson) => {
              const status = lessonStatus(lesson)
              const isNext = lesson.id === upNext?.id
              return (
                <motion.li key={lesson.id} variants={item}>
                  <Link
                    href={`/learn/${lesson.id}`}
                    aria-current={isNext ? "step" : undefined}
                    className={cn(
                      "group flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isNext && "bg-primary/[0.04]",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums text-muted-foreground">
                      {lesson.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {lesson.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lesson.subtitle}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <StatusBadge status={status} />
                        <span>{lesson.level}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock aria-hidden="true" className="size-3" />
                          {lesson.estimatedMinutes} min
                        </span>
                        {status === "in_progress" && <span>Best {lesson.progress}%</span>}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </motion.li>
              )
            })}
          </motion.ol>
        </>
      )}
    </motion.div>
  )
}
