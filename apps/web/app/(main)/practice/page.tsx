"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronLeft, ChevronRight, Flame, PartyPopper, RotateCw } from "lucide-react"
import { motion } from "motion/react"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { MissionItemIcon } from "@/components/practice/MissionItemIcon"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useDailyPhrase } from "@/hooks/useDailyPhrase"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useStreak } from "@/hooks/useStreak"
import { useVocab } from "@/hooks/useVocab"
import {
  chatApi,
  getApiErrorMessage,
  nextReviewBatchSize,
  scenarioApi,
  scenarioSessionsApi,
  type DailyMission,
  type MissionItem,
} from "@/lib/api"
import {
  missionItemCtaLabel,
  missionItemHref,
  missionItemLabel,
  missionItemSummary,
} from "@/lib/learning/mission-item-display"
import { skillLabel } from "@/lib/learning/skills"
import { containerVariants, itemVariants } from "@/lib/motion"

// Today's practice is a focused, one-item-at-a-time session over the same
// personalized mission /home's TodayMissionCard shows (kori_daily_missions /
// kori_daily_mission_items via useDailyMission) — not a dashboard. Complex
// activities (listening, speaking, phrase review, mistake review, mock
// interview) hand off to their own dedicated, already-built surfaces; this
// page only orchestrates "what's next" and re-checks real evidence
// (missionsApi.refreshProgress, via useDailyMission) whenever the learner
// comes back to it.
export default function PracticePage() {
  return (
    <div className="space-y-5">
      <WorkspaceTabs sectionId="learn" />
      <PracticeSession />
    </div>
  )
}

function PracticeSession() {
  useSessionTimer("practice")
  const { mission, loading, error, refreshMission } = useDailyMission()
  const { streakDays } = useStreak()
  // Same cache VocabPreview below already reads — the completion screen needs
  // the backlog size so it can offer another batch instead of dead-ending.
  const { dueCount, loading: vocabLoading } = useVocab()

  const items = mission?.items ?? []
  const completedCount = items.filter((i) => i.status === "completed").length
  // A mission with no items has nothing to step through — treat it like a
  // finished one so the learner gets the caught-up screen (and any extra reps
  // that are waiting) rather than an empty progress bar.
  const allDone = items.length === 0 || completedCount === items.length

  const [viewIndex, setViewIndex] = useState<number | null>(null)
  const prevStatusRef = useRef<Record<string, MissionItem["status"]>>({})

  // Re-check real evidence every time this page is opened — the learner may
  // have just finished a review/listening/speaking activity elsewhere.
  useEffect(() => {
    void refreshMission()
    // Only on mount — refreshMission itself is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Land on the first unfinished item once the mission loads, then only ever
  // auto-advance forward when the item currently in view completes for real.
  useEffect(() => {
    if (items.length === 0) return
    if (viewIndex === null) {
      const firstIncomplete = items.findIndex((i) => i.status !== "completed")
      setViewIndex(firstIncomplete === -1 ? items.length - 1 : firstIncomplete)
      prevStatusRef.current = Object.fromEntries(items.map((i) => [i.id, i.status]))
      return
    }
    const current = items[viewIndex]
    const prevStatus = current && prevStatusRef.current[current.id]
    if (current && prevStatus && prevStatus !== "completed" && current.status === "completed") {
      const nextIncomplete = items.findIndex(
        (i, idx) => idx > viewIndex && i.status !== "completed",
      )
      if (nextIncomplete !== -1) setViewIndex(nextIncomplete)
    }
    prevStatusRef.current = Object.fromEntries(items.map((i) => [i.id, i.status]))
    // items is a new array on every fetch — depend on its content via mission.id
    // and completedCount instead of the array reference itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.id, completedCount])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
  }

  if (error || !mission) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <ErrorBanner>Couldn&apos;t load today&apos;s practice.</ErrorBanner>
        <Button variant="outline" onClick={() => void refreshMission()}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    )
  }

  if (allDone) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <CompletionSummary
          mission={mission}
          streakDays={streakDays}
          dueCount={dueCount}
          dueLoading={vocabLoading}
        />
      </div>
    )
  }

  const current = viewIndex !== null ? items[viewIndex] : null

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl space-y-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Today&apos;s Practice</h2>
          {viewIndex !== null && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewIndex((i) => Math.max(0, (i ?? 0) - 1))}
                disabled={viewIndex === 0}
                aria-label="Previous step"
                className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <span
                aria-live="polite"
                className="text-xs font-bold tabular-nums text-muted-foreground"
              >
                <span className="sr-only">Step </span>
                {viewIndex + 1}
                <span aria-hidden="true"> / </span>
                <span className="sr-only"> of </span>
                {items.length}
              </span>
              <button
                type="button"
                onClick={() => setViewIndex((i) => Math.min(items.length - 1, (i ?? 0) + 1))}
                disabled={viewIndex === items.length - 1}
                aria-label="Next step"
                className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Steps completed today"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={completedCount}
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-accent/40"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </motion.div>

      {current && (
        <motion.div key={current.id} variants={itemVariants}>
          <StepCard item={current} />
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── One focused step ───────────────────────────────────────────────────────

function StepCard({ item }: { item: MissionItem }) {
  const done = item.status === "completed"

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40 sm:p-8">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <MissionItemIcon type={item.type} size={17} strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {missionItemLabel(item.type)}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{missionItemSummary(item)}</p>
        </div>
      </div>

      <div className="mt-5">
        {item.type === "vocab_review" ? (
          <VocabPreview item={item} />
        ) : item.type === "daily_phrase" ? (
          <DailyPhrasePreview />
        ) : (
          <p className="text-sm leading-relaxed text-foreground">{item.title}</p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
      </div>

      {done ? (
        <p className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={18} strokeWidth={2.5} />
          Done for today
        </p>
      ) : (
        <StepAction item={item} />
      )}
    </div>
  )
}

function StepAction({ item }: { item: MissionItem }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState("")
  const ctaLabel = missionItemCtaLabel(item.type)

  if (item.type !== "scenario") {
    const href = missionItemHref(item)
    if (!href) return null
    return (
      <Link
        href={href}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.985]"
      >
        {ctaLabel}
      </Link>
    )
  }

  // Scenario needs a real conversation + scenario session created first (so
  // the mission item's completion evidence — a task-completed session row —
  // exists once the learner finishes it), then hands off to /chat.
  async function startScenario() {
    const scenarioId = item.referenceIds[0]
    if (!scenarioId) return
    setStarting(true)
    setStartError("")
    try {
      const scenario = await scenarioApi.getById(scenarioId)
      const conversation = await chatApi.createConversation(
        `Scenario: ${scenario.title}`,
        "SCENARIO",
        scenario.id,
      )
      await scenarioSessionsApi.start(scenario.id, conversation.id, item.id)
      router.push(`/chat?conversationId=${conversation.id}`)
    } catch (err) {
      setStartError(getApiErrorMessage(err, "Could not start this scenario. Try again."))
      setStarting(false)
    }
  }

  return (
    <>
      {startError && <p className="mt-4 text-xs font-semibold text-destructive">{startError}</p>}
      <button
        type="button"
        onClick={() => void startScenario()}
        disabled={starting}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.985] disabled:opacity-60"
      >
        {starting ? "Starting…" : ctaLabel}
      </button>
    </>
  )
}

// ─── Type-specific Korean-first previews ────────────────────────────────────

function VocabPreview({ item }: { item: MissionItem }) {
  const { dueToday, loading } = useVocab()
  // Fixed-height placeholder so the card doesn't jump when the words arrive.
  if (loading) return <Skeleton className="h-20 w-full rounded-lg" />
  const words = dueToday.filter((w) => item.referenceIds.includes(w.id)).slice(0, 3)
  if (words.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {words.map((w) => (
        <li key={w.id} className="flex items-baseline gap-2">
          <span lang="ko" className="text-base font-bold text-foreground">
            {w.term}
          </span>
          <span className="text-sm text-muted-foreground">{w.meaning}</span>
        </li>
      ))}
    </ul>
  )
}

function DailyPhrasePreview() {
  const { phrase, loading } = useDailyPhrase()
  if (loading) return <Skeleton className="h-8 w-2/3 rounded-lg" />
  if (!phrase) return null

  return (
    <div className="flex items-center gap-2">
      <p lang="ko" className="text-xl font-bold leading-snug text-foreground">
        {phrase.phrase}
      </p>
      <SpeakButton text={phrase.phrase} className="shrink-0" />
    </div>
  )
}

// ─── Completion summary ──────────────────────────────────────────────────────

function CompletionSummary({
  mission,
  streakDays,
  dueCount,
  dueLoading,
}: {
  mission: DailyMission
  streakDays: number | null
  dueCount: number
  dueLoading: boolean
}) {
  const nextBatch = nextReviewBatchSize(dueCount)
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 pt-2"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <PartyPopper size={22} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">Daily goal complete!</h2>
          <p className="text-sm text-muted-foreground">
            You finished everything today&apos;s plan asked for.
          </p>
        </div>
      </motion.div>

      {mission.items.length > 0 && (
        <motion.ul
          variants={itemVariants}
          className="space-y-2 rounded-3xl border border-border bg-card p-5 dark:bg-slate-900/40"
        >
          {mission.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 size={15} strokeWidth={2.5} className="shrink-0 text-emerald-500" />
              {missionItemSummary(item)}
            </li>
          ))}
        </motion.ul>
      )}

      {mission.focusSkillCodes.length > 0 && (
        <motion.p variants={itemVariants} className="px-1 text-xs text-muted-foreground">
          Keep an eye on: {mission.focusSkillCodes.map(skillLabel).join(", ")}
        </motion.p>
      )}

      {streakDays != null && streakDays > 0 && (
        <motion.p
          variants={itemVariants}
          className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground"
        >
          <Flame size={13} className="shrink-0 text-orange-500" />
          {streakDays} day streak
        </motion.p>
      )}

      {/* The daily plan is done, but the SRS backlog usually isn't — so the
          screen offers the next batch instead of ending the session. Extra
          reps are framed as optional: the streak and the daily goal are
          already banked either way. */}
      <motion.div variants={itemVariants}>
        {dueLoading ? (
          <Skeleton className="h-44 w-full rounded-3xl" />
        ) : nextBatch > 0 ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/[0.04] p-5">
            <p className="text-sm font-bold text-foreground">Want to keep going?</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {dueCount.toLocaleString()} {dueCount === 1 ? "word is" : "words are"} still due for
              review. Anything past here is optional — today&apos;s goal is already met.
            </p>
            <Link
              href="/vocab?review=session"
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.985]"
            >
              Review {nextBatch} more
            </Link>
            <Link
              href="/vocab?review=setup"
              className="mt-2 flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-bold text-foreground transition-colors hover:bg-accent"
            >
              Choose a longer session
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5 dark:bg-slate-900/40">
            <p className="text-sm font-bold text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Nothing else is due for review right now. Your next words come back around as they
              come due.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="pb-4 text-center">
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Finish for today
        </Link>
      </motion.div>
    </motion.div>
  )
}
