"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  AudioLines,
  CircleHelp,
  Eye,
  EyeOff,
  Flag,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react"

import { AudioRecorder } from "@/components/korean-coach/AudioRecorder"
import { CoachAudioPlayer } from "@/components/korean-coach/CoachAudioPlayer"
import { CoachFeedback } from "@/components/korean-coach/CoachFeedback"
import { SessionSummary } from "@/components/korean-coach/SessionSummary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getApiErrorMessage,
  koreanCoachAiApi,
  koreanCoachApi,
  type KoreanCoachAiMode,
  type KoreanPracticeSession,
  type KoreanPracticeTurn,
} from "@/lib/api"
import { getKoreanCoachScenario, KOREAN_COACH_SCENARIOS } from "@/lib/korean-coach/scenarios"
import type {
  KoreanCoachPreferences,
  KoreanPhrase,
  KoreanSessionSummary,
  KoreanTutorFeedback,
  SpeechSpeed,
} from "@/lib/korean-coach/schemas"
import { cn } from "@/lib/utils"
import { useSessionTimer } from "@/hooks/useSessionTimer"

const MAX_TURNS = 5
type PracticePhase = "setup" | "prompt" | "feedback" | "summary"

export default function KoreanCoachPracticePage() {
  useSessionTimer("korean_coach")
  const params = useParams<{ scenarioId: string }>()
  const scenario = getKoreanCoachScenario(params.scenarioId)
  const [preferences, setPreferences] = useState<KoreanCoachPreferences | null>(null)
  const [session, setSession] = useState<KoreanPracticeSession | null>(null)
  const [currentTurn, setCurrentTurn] = useState<KoreanPracticeTurn | null>(null)
  const [turnNumber, setTurnNumber] = useState(1)
  const [phase, setPhase] = useState<PracticePhase>("setup")
  const [speed, setSpeed] = useState<SpeechSpeed>(0.75)
  const [transcriptVisible, setTranscriptVisible] = useState(false)
  const [englishVisible, setEnglishVisible] = useState(false)
  const [romanizationVisible, setRomanizationVisible] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [feedback, setFeedback] = useState<KoreanTutorFeedback | null>(null)
  const [feedbackHistory, setFeedbackHistory] = useState<KoreanTutorFeedback[]>([])
  const [retryTarget, setRetryTarget] = useState<KoreanPhrase | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [mistakesSaved, setMistakesSaved] = useState(0)
  const [currentMistakesSaved, setCurrentMistakesSaved] = useState(false)
  const [summary, setSummary] = useState<KoreanSessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [aiMode, setAiMode] = useState<KoreanCoachAiMode | null>(null)
  const startedAtRef = useRef(Date.now())
  const attemptedTurnsRef = useRef(new Set<number>())

  useEffect(() => {
    let active = true
    koreanCoachApi
      .getPreferences()
      .then((data) => {
        if (!active) return
        setPreferences(data)
        setSpeed(data.defaultSpeechSpeed)
        setRomanizationVisible(data.romanizationMode === "always")
      })
      .catch((cause) => {
        if (active) setError(getApiErrorMessage(cause, "Coach preferences could not be loaded."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const progress = Math.min(100, ((turnNumber - 1) / MAX_TURNS) * 100)
  const nextScenario = useMemo(
    () =>
      scenario
        ? KOREAN_COACH_SCENARIOS.find(
            (candidate) => candidate.category === scenario.category && candidate.id !== scenario.id,
          )
        : undefined,
    [scenario],
  )

  if (!scenario) {
    return (
      <div className="space-y-4">
        <ErrorBanner>That Korean Coach scenario does not exist.</ErrorBanner>
        <Button asChild variant="outline">
          <Link href="/korean-coach/scenarios">Return to scenarios</Link>
        </Button>
      </div>
    )
  }

  async function startPractice() {
    if (!preferences || busy) return
    setBusy(true)
    setError("")
    try {
      const createdSession = await koreanCoachApi.startSession(
        scenario!.id,
        "speaking",
        preferences,
      )
      const turn = await koreanCoachApi.createTurn(createdSession.id, 1, scenario!.openingMessage)
      startedAtRef.current = Date.now()
      setSession(createdSession)
      setCurrentTurn(turn)
      setPhase("prompt")
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          "The session could not start. Apply the latest database migration and try again.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function processAnswer(input: {
    transcript: string
    inputMethod: "audio" | "text"
    durationMs: number | null
    mode?: KoreanCoachAiMode
  }) {
    if (!preferences || !session || !currentTurn || busy) return
    setBusy(true)
    setError("")
    if (input.mode) setAiMode(input.mode)
    try {
      const result = await koreanCoachAiApi.feedback({
        scenarioId: scenario!.id,
        transcript: input.transcript,
        tutorMessage: currentTurn.tutorMessage,
        turn: turnNumber,
        correctionStrictness: preferences.correctionStrictness,
      })
      setAiMode(result.mode)
      const isRetry = attemptedTurnsRef.current.has(turnNumber)
      await koreanCoachApi.saveAttempt({
        sessionId: session.id,
        turnId: currentTurn.id,
        inputMethod: input.inputMethod,
        transcript: input.transcript,
        feedback: result.feedback,
        recordingDurationMs: input.durationMs,
        isRetry,
      })
      attemptedTurnsRef.current.add(turnNumber)
      setAttemptCount((count) => count + 1)
      setFeedback(result.feedback)
      setFeedbackHistory((history) => [...history, result.feedback])
      setRetryTarget(null)
      setCurrentMistakesSaved(false)
      setPhase("feedback")
    } catch (cause) {
      throw new Error(
        getApiErrorMessage(
          cause,
          "Your answer could not be processed. Try again or use text input.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitAudio(audio: Blob, durationMs: number) {
    const transcription = await koreanCoachAiApi.transcribe(audio, durationMs)
    await processAnswer({
      transcript: transcription.transcript,
      inputMethod: "audio",
      durationMs,
      mode: transcription.mode,
    })
  }

  async function submitText(transcript: string) {
    await processAnswer({ transcript, inputMethod: "text", durationMs: null })
  }

  async function revealTranscript() {
    const next = !transcriptVisible
    setTranscriptVisible(next)
    if (next && currentTurn) {
      void koreanCoachApi.updateTurnLearningAids(currentTurn.id, {
        transcriptRevealed: true,
      })
    }
  }

  function showHint() {
    setHintVisible(true)
    if (currentTurn) {
      void koreanCoachApi.updateTurnLearningAids(currentTurn.id, { hintUsed: true })
    }
  }

  async function saveCurrentMistakes() {
    if (!feedback || !session || currentMistakesSaved || feedback.mistakes.length === 0) return
    setBusy(true)
    setError("")
    try {
      const count = await koreanCoachApi.saveMistakes({
        mistakes: feedback.mistakes,
        feedback,
        scenarioId: scenario!.id,
        sourceId: session.id,
      })
      setMistakesSaved((current) => current + count)
      setCurrentMistakesSaved(true)
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The correction could not be saved."))
    } finally {
      setBusy(false)
    }
  }

  function tryAgain() {
    if (!feedback) return
    setRetryTarget(feedback.correctedSentence)
    setPhase("prompt")
  }

  async function continueConversation() {
    if (!feedback || !session || !currentTurn || busy) return
    setBusy(true)
    setError("")
    try {
      await koreanCoachApi.completeTurn(currentTurn.id, feedback.taskCompleted)
      if (turnNumber >= MAX_TURNS) {
        await finishSession()
        return
      }
      const nextTurnNumber = turnNumber + 1
      const turn = await koreanCoachApi.createTurn(
        session.id,
        nextTurnNumber,
        feedback.nextTutorMessage,
      )
      setTurnNumber(nextTurnNumber)
      setCurrentTurn(turn)
      setFeedback(null)
      setRetryTarget(null)
      setTranscriptVisible(false)
      setEnglishVisible(false)
      setHintVisible(false)
      setRomanizationVisible(preferences?.romanizationMode === "always")
      setPhase("prompt")
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The next turn could not be prepared."))
    } finally {
      setBusy(false)
    }
  }

  async function finishSession() {
    if (!session) return
    setBusy(true)
    setError("")
    const allFeedback = feedback
      ? [...feedbackHistory.filter((item) => item !== feedback), feedback]
      : feedbackHistory
    const lastFeedback = allFeedback.at(-1)
    const vocabularyMap = new Map<string, { korean: string; meaning: string }>()
    for (const item of allFeedback) {
      for (const word of item.newVocabulary) vocabularyMap.set(word.korean, word)
    }
    const summaryInput: KoreanSessionSummary = {
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
      speakingAttempts: attemptCount,
      completedTurns: attemptedTurnsRef.current.size,
      newVocabulary: [...vocabularyMap.values()].slice(0, 20),
      mainCorrection:
        lastFeedback?.mistakes.find((mistake) => mistake.important)?.explanation ??
        lastFeedback?.feedback.summary ??
        "",
      strongPoint: lastFeedback?.strongPoint ?? "",
      recommendedImprovement: lastFeedback?.recommendedImprovement ?? "",
      mistakesSaved,
      suggestedNextScenarioId: nextScenario?.id ?? null,
    }
    try {
      const saved = await koreanCoachApi.completeSession(session.id, summaryInput)
      setSummary(saved)
      setPhase("summary")
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The summary could not be saved. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  if (!loading && !preferences) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <ErrorBanner>{error || "Coach preferences could not be loaded."}</ErrorBanner>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/korean-coach/scenarios">Return to scenarios</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !preferences) {
    return <Skeleton className="mx-auto h-[42rem] max-w-3xl rounded-2xl" />
  }

  if (phase === "summary" && summary) {
    return (
      <div className="mx-auto max-w-2xl pb-14">
        <SessionSummary summary={summary} scenario={scenario} />
      </div>
    )
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-14">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/korean-coach/scenarios">
            <ArrowLeft aria-hidden="true" />
            Scenarios
          </Link>
        </Button>
        <Card>
          <CardContent className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {scenario.category === "workplace" ? "Workplace Korean" : "Daily Korean"}
                </Badge>
                <Badge variant="secondary">{scenario.difficulty}</Badge>
                <Badge variant="secondary">{scenario.estimatedMinutes} min</Badge>
              </div>
              <h2 className="mt-5 text-3xl font-semibold" lang="ko">
                {scenario.koreanTitle}
              </h2>
              <p className="mt-1 text-lg font-medium">{scenario.englishTitle}</p>
              <p className="mt-3 leading-7 text-muted-foreground">{scenario.description}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Useful vocabulary</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {scenario.usefulVocabulary.map((word) => (
                  <Badge key={word.korean} variant="secondary">
                    <span lang="ko">{word.korean}</span> · {word.meaning}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Your recording is sent to an AI service for transcription and feedback. Do not
                  include sensitive workplace or personal information. Raw recordings are processed
                  transiently and are not saved.
                </p>
              </div>
            </div>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void startPractice()}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              ) : (
                <AudioLines />
              )}
              {busy ? "Starting session…" : "Start listening"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+3.5rem)]">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{scenario.englishTitle}</p>
            <p className="truncate text-xs text-muted-foreground" lang="ko">
              {scenario.koreanTitle}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void finishSession()}
            disabled={busy}
          >
            <Flag aria-hidden="true" />
            End session
          </Button>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
            <span>
              Turn {turnNumber} of {MAX_TURNS}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`Practice progress: turn ${turnNumber} of ${MAX_TURNS}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {aiMode === "mock" && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Mock mode is active. Feedback is development seed output, and audio uses a browser
          preview—not an AI-generated voice.
        </div>
      )}
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {phase === "feedback" && feedback ? (
        <CoachFeedback
          feedback={feedback}
          romanizationMode={preferences.romanizationMode}
          speed={speed}
          onSpeedChange={setSpeed}
          onTryAgain={tryAgain}
          onContinue={() => void continueConversation()}
          onSaveMistakes={saveCurrentMistakes}
          mistakesSaved={currentMistakesSaved}
          busy={busy}
        />
      ) : currentTurn ? (
        <>
          <Card>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AudioLines className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">Hengo Korean Coach</p>
                  <p className="text-xs text-muted-foreground">
                    Listen before revealing the transcript
                  </p>
                </div>
              </div>

              <CoachAudioPlayer
                text={currentTurn.tutorMessage.korean}
                speed={speed}
                onSpeedChange={setSpeed}
                label="Tutor question"
              />

              {retryTarget && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Say this corrected answer again
                  </p>
                  <p className="mt-2 text-xl font-semibold" lang="ko">
                    {retryTarget.korean}
                  </p>
                  {preferences.romanizationMode === "always" && (
                    <p className="mt-1 text-xs italic text-muted-foreground/70">
                      {retryTarget.romanization}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">{retryTarget.english}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => void revealTranscript()}
                >
                  {transcriptVisible ? <EyeOff /> : <Eye />}
                  {transcriptVisible ? "Hide transcript" : "Show transcript"}
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={showHint}>
                  <Lightbulb />
                  Give me a hint
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="col-span-2 min-h-11"
                  onClick={() => setEnglishVisible(true)}
                >
                  <CircleHelp />I don’t understand
                </Button>
              </div>

              {(transcriptVisible || englishVisible || hintVisible) && (
                <div className="space-y-3 rounded-xl bg-muted/35 p-4" aria-live="polite">
                  {transcriptVisible && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Korean transcript
                      </p>
                      <p className="mt-2 text-xl font-semibold leading-relaxed" lang="ko">
                        {currentTurn.tutorMessage.korean}
                      </p>
                      {preferences.romanizationMode !== "never" && (
                        <>
                          {preferences.romanizationMode === "on-request" &&
                            !romanizationVisible && (
                              <button
                                type="button"
                                onClick={() => setRomanizationVisible(true)}
                                className="mt-2 min-h-11 text-xs font-medium text-primary underline-offset-4 hover:underline"
                              >
                                Show romanization
                              </button>
                            )}
                          {romanizationVisible && (
                            <p className="mt-1 text-xs italic text-muted-foreground/65">
                              {currentTurn.tutorMessage.romanization}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {englishVisible && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        English meaning
                      </p>
                      <p className="mt-1 text-sm">{currentTurn.tutorMessage.english}</p>
                    </div>
                  )}
                  {hintVisible && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Hint
                      </p>
                      <p className="mt-1 text-sm leading-6">{scenario.hint}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn(busy && "opacity-80")}>
            <CardContent>
              <AudioRecorder
                onSubmitAudio={submitAudio}
                onSubmitText={submitText}
                disabled={busy}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Skeleton className="h-96 rounded-2xl" />
      )}
    </div>
  )
}
