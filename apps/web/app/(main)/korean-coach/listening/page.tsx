"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  Ear,
  Eye,
  Headphones,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { CoachAudioPlayer } from "@/components/korean-coach/CoachAudioPlayer"
import { SessionSummary } from "@/components/korean-coach/SessionSummary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiErrorMessage, koreanCoachApi, vocabApi, type KoreanPracticeSession } from "@/lib/api"
import {
  LISTENING_CHALLENGES,
  type ListeningChallenge,
} from "@/lib/korean-coach/listening-challenges"
import type {
  KoreanCoachPreferences,
  KoreanSessionSummary,
  SpeechSpeed,
} from "@/lib/korean-coach/schemas"
import { useSessionTimer } from "@/hooks/useSessionTimer"

const MAX_REPLAYS = 3

export default function KoreanCoachListeningPage() {
  useSessionTimer("korean_coach")
  const [preferences, setPreferences] = useState<KoreanCoachPreferences | null>(null)
  const [session, setSession] = useState<KoreanPracticeSession | null>(null)
  const [index, setIndex] = useState(0)
  const [speed, setSpeed] = useState<SpeechSpeed>(0.75)
  const [replayCount, setReplayCount] = useState(0)
  const [answer, setAnswer] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [englishVisible, setEnglishVisible] = useState(false)
  const [savedWords, setSavedWords] = useState(new Set<string>())
  const [summary, setSummary] = useState<KoreanSessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const startedAtRef = useRef(Date.now())
  const challenge = LISTENING_CHALLENGES[index]

  useEffect(() => {
    let active = true
    Promise.all([koreanCoachApi.getPreferences(), vocabApi.getSavedWords()])
      .then(([preferenceData, words]) => {
        if (!active) return
        setPreferences(preferenceData)
        setSpeed(preferenceData.defaultSpeechSpeed)
        setSavedWords(new Set(words.map((word) => word.term)))
      })
      .catch((cause) => {
        if (active) setError(getApiErrorMessage(cause, "Listening practice could not load."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const completedCount = useMemo(() => (revealed ? index + 1 : index), [index, revealed])

  async function start() {
    if (!preferences || busy) return
    setBusy(true)
    setError("")
    try {
      const created = await koreanCoachApi.startSession(null, "listening", preferences)
      setSession(created)
      startedAtRef.current = Date.now()
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The listening session could not start."))
    } finally {
      setBusy(false)
    }
  }

  function registerReplay(): boolean {
    if (replayCount >= MAX_REPLAYS) return false
    setReplayCount((count) => count + 1)
    return true
  }

  function revealAnswer() {
    if (!answer.trim()) {
      setError("Type what you heard before revealing the transcript.")
      return
    }
    setError("")
    setRevealed(true)
  }

  async function saveWord(word: ListeningChallenge["vocabulary"][number]) {
    if (savedWords.has(word.korean)) return
    try {
      await vocabApi.save({
        category: challenge.category === "workplace" ? "Workplace" : "Daily Life",
        term: word.korean,
        meaning: word.meaning,
        example: challenge.phrase.korean,
      })
      setSavedWords((current) => new Set(current).add(word.korean))
      toast.success(`${word.korean} saved to vocabulary`)
    } catch (cause) {
      setError(getApiErrorMessage(cause, "That word could not be saved."))
    }
  }

  async function finish() {
    if (!session) return
    setBusy(true)
    const allVocabulary = LISTENING_CHALLENGES.slice(0, completedCount).flatMap(
      (item) => item.vocabulary,
    )
    const vocabulary = [...new Map(allVocabulary.map((word) => [word.korean, word])).values()]
    const summaryInput: KoreanSessionSummary = {
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
      speakingAttempts: 0,
      completedTurns: completedCount,
      newVocabulary: vocabulary.slice(0, 20),
      mainCorrection: "Compare what you typed with the revealed Korean transcript.",
      strongPoint: `You completed ${completedCount} transcript-hidden listening challenge${completedCount === 1 ? "" : "s"}.`,
      recommendedImprovement:
        "Replay one difficult sentence slowly, then once more at normal speed.",
      mistakesSaved: 0,
      suggestedNextScenarioId: "daily-standup",
    }
    try {
      const saved = await koreanCoachApi.completeSession(session.id, summaryInput)
      setSummary(saved)
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The listening summary could not be saved."))
    } finally {
      setBusy(false)
    }
  }

  function next() {
    if (index >= LISTENING_CHALLENGES.length - 1) {
      void finish()
      return
    }
    setIndex((current) => current + 1)
    setReplayCount(0)
    setAnswer("")
    setRevealed(false)
    setEnglishVisible(false)
    setSpeed(preferences?.defaultSpeechSpeed ?? 0.75)
    setError("")
  }

  if (!loading && !preferences) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <ErrorBanner>{error || "Listening preferences could not be loaded."}</ErrorBanner>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/korean-coach">Return to Korean Coach</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !preferences) {
    return <Skeleton className="mx-auto h-[42rem] max-w-2xl rounded-2xl" />
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl pb-14">
        <SessionSummary summary={summary} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-14">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/korean-coach">
            <ArrowLeft aria-hidden="true" />
            Korean Coach
          </Link>
        </Button>
        <Card>
          <CardContent className="space-y-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Headphones className="size-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Listening focus
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Listen before you read</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Hear a short Korean sentence, type what you understood, then reveal the transcript
                and useful vocabulary. Each sentence has up to three replays.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">
                  The sentence uses an AI-generated voice in live mode. This challenge does not
                  record your microphone.
                </p>
              </div>
            </div>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void start()}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Ear />
              )}
              {busy ? "Starting…" : "Start listening challenge"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+3rem)]">
      <header>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="-ml-3"
            onClick={() => void finish()}
            disabled={busy}
          >
            <ArrowLeft aria-hidden="true" />
            End session
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            Sentence {index + 1} of {LISTENING_CHALLENGES.length}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Listening progress: sentence ${index + 1} of ${LISTENING_CHALLENGES.length}`}
          aria-valuemin={1}
          aria-valuemax={LISTENING_CHALLENGES.length}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${((index + 1) / LISTENING_CHALLENGES.length) * 100}%` }}
          />
        </div>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">
              {challenge.category === "workplace" ? "Workplace Korean" : "Daily Korean"}
            </Badge>
            <p className="text-xs font-medium text-muted-foreground">
              Replays {replayCount}/{MAX_REPLAYS}
            </p>
          </div>

          <div className="flex min-h-24 items-center justify-center rounded-2xl bg-muted/35">
            {revealed ? (
              <p className="px-4 text-center text-2xl font-semibold leading-relaxed" lang="ko">
                {challenge.phrase.korean}
              </p>
            ) : (
              <div className="text-center">
                <Headphones className="mx-auto size-8 text-primary" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">Transcript hidden</p>
              </div>
            )}
          </div>

          <CoachAudioPlayer
            text={challenge.phrase.korean}
            speed={speed}
            onSpeedChange={setSpeed}
            label="Listening sentence"
            onReplay={registerReplay}
            replayDisabled={replayCount >= MAX_REPLAYS}
          />

          {!revealed ? (
            <div className="space-y-3">
              <label htmlFor="listening-answer" className="text-sm font-semibold">
                What did you understand?
              </label>
              <Input
                id="listening-answer"
                lang="ko"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type Korean or a short English meaning…"
                maxLength={500}
              />
              <Button type="button" size="lg" className="w-full" onClick={revealAnswer}>
                <Eye aria-hidden="true" />
                Reveal transcript
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  You understood
                </p>
                <p className="mt-2 text-sm">{answer}</p>
              </div>

              {preferences.romanizationMode !== "never" && (
                <p className="text-xs italic text-muted-foreground/65">
                  {challenge.phrase.romanization}
                </p>
              )}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Useful vocabulary</p>
                  <Badge variant="secondary">Highlighted after reveal</Badge>
                </div>
                <ul className="mt-3 space-y-2">
                  {challenge.vocabulary.map((word) => (
                    <li
                      key={word.korean}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-primary" lang="ko">
                          {word.korean}
                        </p>
                        <p className="text-xs text-muted-foreground">{word.meaning}</p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={
                          savedWords.has(word.korean)
                            ? `${word.korean} saved`
                            : `Save ${word.korean} as a difficult word`
                        }
                        onClick={() => void saveWord(word)}
                        disabled={savedWords.has(word.korean)}
                      >
                        {savedWords.has(word.korean) ? <Check /> : <BookmarkPlus />}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {englishVisible ? (
                <div className="rounded-xl bg-muted/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    English meaning
                  </p>
                  <p className="mt-2">{challenge.phrase.english}</p>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setEnglishVisible(true)}
                >
                  Show English
                </Button>
              )}

              <p className="text-sm leading-6 text-muted-foreground">
                Play once at 0.75× for slow audio, then change to 1× and listen again at normal
                speed.
              </p>

              <Button type="button" size="lg" className="w-full" onClick={next} disabled={busy}>
                {index === LISTENING_CHALLENGES.length - 1 ? "Finish session" : "Next sentence"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
