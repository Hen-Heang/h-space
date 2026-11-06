"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PartyPopper } from "lucide-react"
import { motion } from "motion/react"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { LearnModeView } from "@/components/phrasebook/practice/LearnModeView"
import { ListeningModeView } from "@/components/phrasebook/practice/ListeningModeView"
import { SpeakingModeView } from "@/components/phrasebook/practice/SpeakingModeView"
import { ReviewModeView } from "@/components/phrasebook/practice/ReviewModeView"
import { WorkMessageModeView } from "@/components/phrasebook/practice/WorkMessageModeView"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { useRomanizationPreference } from "@/hooks/useRomanizationPreference"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { isCardDue } from "@/lib/korean-phrasebook/mastery"
import { containerVariants, itemVariants } from "@/lib/motion"
import type { PhraseCardWithProgress } from "@/lib/types"

type Mode = "learn" | "listen" | "speak" | "review" | "work"

const MODE_TITLE: Record<Mode, string> = {
  learn: "Learn",
  listen: "Listening practice",
  speak: "Speaking practice",
  review: "Review",
  work: "Work message",
}

const MODES: Mode[] = ["learn", "listen", "speak", "review", "work"]

function PhrasebookPracticeInner() {
  useSessionTimer("phrasebook")
  const router = useRouter()
  const searchParams = useSearchParams()
  const modeParam = searchParams.get("mode")
  const mode: Mode = MODES.includes(modeParam as Mode) ? (modeParam as Mode) : "learn"
  const collectionId = searchParams.get("collectionId") ?? undefined
  // Today's Mission links straight to the card it picked (work mode).
  const phraseId = searchParams.get("phraseId") ?? undefined
  const romanizationPreference = useRomanizationPreference()

  const [cards, setCards] = useState<PhraseCardWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  // Bumped by "Practice again" so the mode views remount at card 1 — they
  // keep their own position, which would otherwise still be past the end.
  const [round, setRound] = useState(0)

  const exitHref = collectionId
    ? `/phrasebook/${collectionId}`
    : mode === "work"
      ? "/learn"
      : "/phrasebook"
  // True when the mission's card no longer exists (deleted or archived).
  const [missingPick, setMissingPick] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    setDone(false)

    async function load() {
      try {
        let queue: PhraseCardWithProgress[]
        if (mode === "work") {
          const all = await phrasebookApi.getWorkMessageCards()
          const pool = collectionId ? all.filter((c) => c.collectionId === collectionId) : all
          const picked = phraseId ? pool.find((c) => c.id === phraseId) : undefined
          // The picked card first, then a few more for an optional longer session.
          queue = picked ? [picked, ...pool.filter((c) => c.id !== picked.id)] : pool
          queue = queue.slice(0, 5)
          if (active) setMissingPick(Boolean(phraseId) && !picked)
        } else if (mode === "learn") {
          queue = collectionId
            ? await phrasebookApi.getCardsForCollection(collectionId)
            : await phrasebookApi.getAllCards()
        } else if (mode === "review") {
          const pool = await phrasebookApi.getPracticeQueue({ collectionId, limit: 30 })
          const due = pool.filter((c) => c.progress && isCardDue(c.progress.nextReviewAt))
          queue = due.length > 0 ? due : pool.slice(0, 10)
        } else {
          queue = await phrasebookApi.getPracticeQueue({ collectionId, limit: 10 })
        }
        if (active) setCards(queue)
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load practice cards."))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [mode, collectionId, phraseId])

  if (loading) {
    return (
      <div className="space-y-4 pb-12">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 pb-12">
        <BackLink href={exitHref} label="Back" />
        <ErrorBanner>{error}</ErrorBanner>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-4 pb-12">
        <BackLink href={exitHref} label="Back" />
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {mode === "work" ? (
            <>
              <p>No work messages to practice yet.</p>
              <Button asChild variant="outline" className="mt-3">
                <Link href="/chat?mode=analyze">Analyze a work message</Link>
              </Button>
            </>
          ) : (
            <p>No cards available for this session yet.</p>
          )}
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-5 pb-12 text-center"
      >
        <motion.div
          variants={itemVariants}
          role="status"
          className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-10"
        >
          <PartyPopper
            aria-hidden="true"
            size={36}
            className="text-emerald-700 dark:text-emerald-300"
          />
          <h2 className="text-lg font-bold text-foreground">Session complete</h2>
          <p className="text-sm text-muted-foreground">
            You practiced {cards.length} {cards.length === 1 ? "card" : "cards"}.
          </p>
          <div className="mt-3 flex gap-2.5">
            <Button variant="outline" onClick={() => router.push(exitHref)}>
              Back
            </Button>
            <Button
              onClick={() => {
                setRound((r) => r + 1)
                setDone(false)
              }}
            >
              Practice again
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <BackLink href={exitHref} label="Back" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {MODE_TITLE[mode]}
        </h2>
      </div>

      {mode === "learn" && (
        <LearnModeView
          key={round}
          cards={cards}
          romanizationPreference={romanizationPreference}
          onExhausted={() => setDone(true)}
        />
      )}
      {mode === "listen" && (
        <ListeningModeView key={round} cards={cards} onExhausted={() => setDone(true)} />
      )}
      {mode === "speak" && (
        <SpeakingModeView key={round} cards={cards} onExhausted={() => setDone(true)} />
      )}
      {mode === "review" && (
        <ReviewModeView key={round} cards={cards} onExhausted={() => setDone(true)} />
      )}
      {mode === "work" && (
        <>
          {missingPick && (
            <p
              role="status"
              className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
            >
              Today&apos;s message was removed from your Phrasebook, so here&apos;s another one. A
              reply to any of these still completes today&apos;s step.
            </p>
          )}
          <WorkMessageModeView
            key={round}
            cards={cards}
            romanizationPreference={romanizationPreference}
            onExhausted={() => setDone(true)}
          />
        </>
      )}
    </div>
  )
}

export default function PhrasebookPracticePage() {
  return (
    <Suspense fallback={null}>
      <PhrasebookPracticeInner />
    </Suspense>
  )
}
