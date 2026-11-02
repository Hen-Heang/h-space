"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react"

import { AnswerFrameHint } from "@/components/interview/AnswerFrameHint"
import {
  CorrectionRetryPanel,
  PRONUNCIATION_DISCLAIMER,
} from "@/components/interview/CorrectionRetryPanel"
import { ExamPracticeDashboard } from "@/components/interview/ExamPracticeDashboard"
import { ListeningQuestionCard } from "@/components/interview/ListeningQuestionCard"
import { QuestionBankBrowser } from "@/components/interview/QuestionBankBrowser"
import { SpeakingControls } from "@/components/interview/SpeakingControls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { getApiErrorMessage, interviewApi } from "@/lib/api"
import type { InterviewAttempt, SpeakingCheckResponse } from "@/lib/api/interview"
import { dateKeyInTimeZone } from "@/lib/date-key"
import {
  DRILL_SIZE,
  averageSpeakingScores,
  buildDrillQueue,
  pickStyleExamples,
  replaceUnseenTail,
  type DrillQuestion,
} from "@/lib/interview-drills"
import {
  INTERVIEW_TIME_ZONE,
  averageScore,
  daysRemainingInSeoul,
  mostDifficultQuestions,
  recommendedDifficulty,
  selectFocusQueue,
  selectTodaysQueue,
  todayQueueStorageKey,
  type PracticeDifficulty,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"
import { stopSpeechAudio } from "@/lib/speech-audio"
import { EXAM_DATE } from "@/lib/study-plan"

type PagePhase = "dashboard" | "bank" | "drill" | "summary"
type PracticeMode = "today" | "ai" | "weak" | "selected"

interface GradedAttempt {
  answer: string
  detectedTranscript: string
  result: SpeakingCheckResponse
}

interface QuestionRun {
  question: DrillQuestion
  attempts: GradedAttempt[]
  skippedRetry: boolean
}

const LAST_SESSION_KEY = "kori.drill.speaking.last"

function toDrillQuestion(question: QuestionBankItem): DrillQuestion {
  return { id: question.id, ko: question.questionKo, en: question.questionEn ?? "" }
}

function uniqueQueue(queue: DrillQuestion[]): DrillQuestion[] {
  const seen = new Set<string>()
  return queue.filter((question) => {
    const key = question.id ?? question.ko
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function SpeakingDrillPage() {
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")
  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })

  const daysRemaining = daysRemainingInSeoul(EXAM_DATE)
  const recommended = recommendedDifficulty(daysRemaining)
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>(recommended)
  const [phase, setPhase] = useState<PagePhase>("dashboard")
  const [mode, setMode] = useState<PracticeMode>("today")
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>({})
  const [latestAttempt, setLatestAttempt] = useState<InterviewAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [queue, setQueue] = useState<DrillQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [runs, setRuns] = useState<QuestionRun[]>([])
  const [detectedTranscript, setDetectedTranscript] = useState("")
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [retryCycle, setRetryCycle] = useState(0)
  const sessionIdRef = useRef("")
  const indexRef = useRef(0)
  const [isRetrying, setIsRetrying] = useState(false)
  indexRef.current = index
  useScrollToTopOnChange(phase)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [bank, savedProgress, attempts] = await Promise.all([
        interviewApi.listQuestions("weather"),
        interviewApi.listQuestionProgress(),
        interviewApi.listAttempts(1),
      ])
      setQuestions(bank)
      setProgress(savedProgress)
      setLatestAttempt(attempts.at(-1) ?? null)
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Could not load your exam question bank."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
    return () => {
      stopSpeechAudio()
    }
  }, [loadDashboard])

  const currentQuestion = queue[index]
  const currentRun = runs.find(
    (run) => (run.question.id ?? run.question.ko) === (currentQuestion?.id ?? currentQuestion?.ko),
  )
  const firstAttempt = currentRun?.attempts[0]
  const retryAttempt =
    currentRun && currentRun.attempts.length > 1 ? currentRun.attempts.at(-1) : undefined

  function launchQueue(nextQueue: DrillQuestion[], nextMode: PracticeMode) {
    const unique = uniqueQueue(nextQueue).slice(0, DRILL_SIZE)
    if (unique.length === 0) {
      setError("No eligible questions are available for this practice mode.")
      return
    }
    stopSpeechAudio()
    speech.reset()
    setDetectedTranscript("")
    setAudioPlaying(false)
    setQueue(unique)
    setIndex(0)
    setRuns([])
    setRetryCycle(0)
    setIsRetrying(false)
    setError("")
    setMode(nextMode)
    sessionIdRef.current = crypto.randomUUID()
    setPhase("drill")
  }

  function startToday() {
    const dateKey = dateKeyInTimeZone(new Date(), INTERVIEW_TIME_ZONE)
    const storageKey = todayQueueStorageKey(dateKey, difficulty)
    let storedIds: string[] = []
    try {
      storedIds = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]
    } catch {
      storedIds = []
    }
    const selected = selectTodaysQueue(questions, progress, difficulty, DRILL_SIZE, storedIds)
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(selected.map((question) => question.id)),
      )
    } catch {
      // The pure deterministic order still remains stable when storage is unavailable.
    }
    launchQueue(selected.map(toDrillQuestion), "today")
  }

  function startWeak() {
    const weakPool = questions.filter((question) => {
      const item = progress[question.id]
      return item && item.timesPracticed > 0 && item.status !== "strong"
    })
    const selected = selectFocusQueue(weakPool, progress, DRILL_SIZE)
    const fallback =
      selected.length > 0 ? selected : mostDifficultQuestions(questions, progress, DRILL_SIZE)
    if (fallback.length === 0) {
      setError("Complete Today's 5 to begin identifying your weak questions.")
      return
    }
    launchQueue(fallback.map(toDrillQuestion), "weak")
  }

  function startAiRandom() {
    const staticQueue = buildDrillQueue()
    launchQueue(staticQueue, "ai")
    interviewApi
      .drillQuestions({
        kind: "speaking",
        count: DRILL_SIZE,
        complexityHint:
          "natural habits-and-hobbies interview phrasing for a beginner answer of 2-3 sentences",
        styleExamples: pickStyleExamples(),
        avoid: staticQueue.map((question) => question.ko),
      })
      .then(({ questions: generated }) => {
        if (generated.length === 0) return
        setQueue((current) =>
          uniqueQueue(
            replaceUnseenTail(
              current,
              generated.map((question) => ({ ko: question.ko, en: question.en })),
              indexRef.current + 1,
            ),
          ),
        )
      })
      .catch(() => {
        // Static questions provide a complete offline-safe AI-mode fallback.
      })
  }

  async function submitAnswer() {
    if (!currentQuestion || isScoring) return
    const stoppedTranscript = speech.status === "listening" ? speech.stop() : ""
    const answer = (stoppedTranscript || speech.transcript).trim()
    const detected = (detectedTranscript || stoppedTranscript || speech.transcript).trim()
    if (!answer) {
      speech.setError("Record or type a complete Korean answer before submitting.")
      return
    }
    if (!detectedTranscript) setDetectedTranscript(detected)
    setIsScoring(true)
    setError("")
    try {
      const result = await interviewApi.speakingCheck({ question: currentQuestion.ko, answer })
      const attempt: GradedAttempt = { answer, detectedTranscript: detected, result }
      setRuns((currentRuns) => {
        const key = currentQuestion.id ?? currentQuestion.ko
        const existing = currentRuns.find((run) => (run.question.id ?? run.question.ko) === key)
        if (!existing)
          return [
            ...currentRuns,
            { question: currentQuestion, attempts: [attempt], skippedRetry: false },
          ]
        return currentRuns.map((run) =>
          (run.question.id ?? run.question.ko) === key
            ? { ...run, attempts: [...run.attempts, attempt] }
            : run,
        )
      })
      setIsRetrying(false)
      await interviewApi.saveAnswer({
        questionId: currentQuestion.id ?? null,
        sessionType: "speaking_drill",
        sessionId: sessionIdRef.current,
        questionKo: currentQuestion.ko,
        answerText: answer,
        scores: result.scores,
        feedback: result.feedback,
        correctedAnswer: result.correctedAnswer,
        naturalAlternative: result.betterAlternative,
        tip: result.tip,
      })
      if (currentQuestion.id) {
        const nextProgress = await interviewApi.listQuestionProgress()
        setProgress(nextProgress)
      }
      void logActivity()
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "Could not score or save this answer. Your transcript is preserved - try again.",
        ),
      )
    } finally {
      setIsScoring(false)
    }
  }

  function retryAnswer() {
    stopSpeechAudio()
    speech.reset()
    setDetectedTranscript("")
    setAudioPlaying(false)
    setError("")
    setIsRetrying(true)
    setRetryCycle((value) => value + 1)
  }

  function nextQuestion() {
    if (!currentQuestion) return
    setRuns((currentRuns) =>
      currentRuns.map((run) =>
        (run.question.id ?? run.question.ko) === (currentQuestion.id ?? currentQuestion.ko) &&
        run.attempts.length === 1
          ? { ...run, skippedRetry: true }
          : run,
      ),
    )
    setIsRetrying(false)
    stopSpeechAudio()
    speech.reset()
    setDetectedTranscript("")
    setAudioPlaying(false)
    setError("")
    setRetryCycle(0)
    if (index + 1 >= queue.length) {
      finishSession()
      return
    }
    setIndex((value) => value + 1)
  }

  function finishSession() {
    stopSpeechAudio()
    speech.reset()
    const allAttempts = runs.flatMap((run) => run.attempts)
    const averages = averageSpeakingScores(allAttempts.map((attempt) => attempt.result.scores))
    try {
      window.localStorage.setItem(
        LAST_SESSION_KEY,
        JSON.stringify({
          finishedAt: new Date().toISOString(),
          answered: runs.length,
          averages,
        }),
      )
    } catch {
      // Summary still renders for this session.
    }
    setPhase("summary")
  }

  const stateLabel = useMemo(() => {
    if (isScoring) return "Scoring"
    if (speech.status === "listening") return "Listening"
    if (speech.transcript.trim()) return "Ready to submit"
    if (retryCycle > 0) return "Retrying"
    return speech.supported ? "Ready" : "Ready for manual entry"
  }, [isScoring, retryCycle, speech.status, speech.supported, speech.transcript])

  if (phase === "bank") {
    return (
      <QuestionBankBrowser
        questions={questions}
        progress={progress}
        onBack={() => setPhase("dashboard")}
        onPractice={(selected) => launchQueue(selected.map(toDrillQuestion), "selected")}
      />
    )
  }

  if (phase === "dashboard") {
    return (
      <div className="pb-12">
        <ExamPracticeDashboard
          questions={questions}
          progress={progress}
          latestAttempt={latestAttempt}
          daysRemaining={daysRemaining}
          recommended={recommended}
          difficulty={difficulty}
          loading={loading}
          error={error}
          onDifficultyChange={setDifficulty}
          onPracticeToday={startToday}
          onAiRandom={startAiRandom}
          onReviewWeak={startWeak}
          onBrowse={() => setPhase("bank")}
        />
      </div>
    )
  }

  if (phase === "summary") {
    const allAttempts = runs.flatMap((run) => run.attempts)
    const averages = averageSpeakingScores(allAttempts.map((attempt) => attempt.result.scores))
    const retried = runs.filter((run) => run.attempts.length > 1).length
    return (
      <div className="mx-auto max-w-3xl space-y-5 pb-12">
        <Card className="rounded-2xl border-blue-500/25 shadow-sm">
          <CardContent className="p-6 text-center sm:p-8">
            <CheckCircle2 className="mx-auto size-10 text-blue-600" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              Today&apos;s practice is complete
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You completed {runs.length} questions and retried {retried}. Your stable-question
              progress has been updated.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Questions</p>
                <p className="mt-1 text-xl font-bold">{runs.length}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Speaking estimate</p>
                <p className="mt-1 text-xl font-bold">
                  {averages?.speaking.toFixed(1) ?? "\u2014"}
                </p>
              </div>
              <div className="col-span-2 rounded-xl bg-muted/40 p-3 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Retries</p>
                <p className="mt-1 text-xl font-bold">{retried}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {PRONUNCIATION_DISCLAIMER}
            </p>
            <Button
              size="lg"
              onClick={() => {
                setPhase("dashboard")
                void loadDashboard()
              }}
              className="mt-6 h-12 w-full sm:w-auto sm:px-8"
            >
              Back to exam dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Per-question breakdown — the session's own attempts, already in
            state; nothing new is fetched or stored. */}
        {runs.length > 0 && (
          <section aria-labelledby="drill-breakdown-heading" className="app-surface">
            <h3
              id="drill-breakdown-heading"
              className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground"
            >
              Question by question
            </h3>
            <ol className="divide-y divide-border">
              {runs.map((run, index) => {
                const first = run.attempts[0]
                const last = run.attempts[run.attempts.length - 1]
                const firstScore = first ? averageScore(first.result.scores) : null
                const lastScore = last ? averageScore(last.result.scores) : null
                return (
                  <li key={`${run.question.id ?? run.question.ko}-${index}`} className="px-5 py-4">
                    <p lang="ko" className="break-keep text-sm font-semibold text-foreground">
                      {index + 1}. {run.question.ko}
                    </p>
                    {last && (
                      <p lang="ko" className="mt-1 break-keep text-sm text-muted-foreground">
                        {last.result.correctedAnswer}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {firstScore === null
                        ? "Not answered"
                        : run.attempts.length > 1 && lastScore !== null
                          ? `${firstScore.toFixed(1)} → ${lastScore.toFixed(1)} / 5 after retry`
                          : `${firstScore.toFixed(1)} / 5`}
                    </p>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-32 sm:pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              stopSpeechAudio()
              speech.reset()
              setPhase("dashboard")
            }}
            className="-ml-3 rounded-xl"
          >
            <ArrowLeft className="mr-2 size-4" />
            End drill
          </Button>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {mode === "today"
                ? "Today's 5"
                : mode === "ai"
                  ? "AI Random"
                  : mode === "weak"
                    ? "Weak review"
                    : "Selected questions"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {index + 1} / {queue.length}
            </span>
          </div>
        </div>
        <div
          className="h-2 w-32 overflow-hidden rounded-full bg-muted"
          aria-label={`${index + 1} of ${queue.length} questions`}
        >
          <div
            className="h-full bg-blue-600 transition-[width] motion-reduce:transition-none"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion ? (
        <ListeningQuestionCard
          question={currentQuestion}
          questionNumber={index + 1}
          total={queue.length}
          resetKey={`${currentQuestion.id ?? currentQuestion.ko}:${retryCycle}`}
          onPlayingChange={setAudioPlaying}
        />
      ) : null}

      {firstAttempt && !isRetrying ? (
        <CorrectionRetryPanel
          questionId={currentQuestion?.id ?? currentQuestion?.ko ?? "unknown"}
          firstAnswer={firstAttempt.answer}
          firstResult={firstAttempt.result}
          retryAnswer={retryAttempt?.answer}
          retryResult={retryAttempt?.result}
          onRetry={retryAnswer}
          onNext={nextQuestion}
          isLast={index + 1 >= queue.length}
        />
      ) : (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <AnswerFrameHint />
            <SpeakingControls
              speech={speech}
              audioPlaying={audioPlaying}
              disabled={isScoring}
              detectedTranscript={detectedTranscript}
              onDetectedTranscript={setDetectedTranscript}
              stateLabel={stateLabel}
            />
            {error ? (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!firstAttempt || isRetrying ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur sm:bottom-4">
          <Button
            onClick={submitAnswer}
            disabled={!speech.transcript.trim() || isScoring || audioPlaying}
            className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {isScoring ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Scoring
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Submit confirmed transcript
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
