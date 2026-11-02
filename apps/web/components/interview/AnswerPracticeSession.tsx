"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  Loader2,
  RotateCcw,
  Send,
  SlidersHorizontal,
} from "lucide-react"

import { AnswerFrameHint } from "@/components/interview/AnswerFrameHint"
import { AnswerInput } from "@/components/interview/AnswerInput"
import { CompareReviewCard } from "@/components/interview/CompareReviewCard"
import { CorrectionRetryPanel } from "@/components/interview/CorrectionRetryPanel"
import { PracticeQuestionCard } from "@/components/interview/PracticeQuestionCard"
import {
  PracticeSourceSheet,
  type PracticeSettings,
} from "@/components/interview/PracticeSourceSheet"
import { PracticeSummary } from "@/components/interview/PracticeSummary"
import { QuestionBankBrowser } from "@/components/interview/QuestionBankBrowser"
import { StickyActionBar } from "@/components/interview/StickyActionBar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useAnswerMode } from "@/hooks/useAnswerMode"
import { interviewProgressQueryKey, interviewQuestionsQueryKey } from "@/hooks/useExamPrepHome"
import { useLeaveGuard } from "@/hooks/useLeaveGuard"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { getApiErrorMessage, interviewApi } from "@/lib/api"
import {
  ANSWER_PRACTICE_PRESETS,
  PRACTICE_SOURCE_LABELS,
  answerPracticeReducer,
  checkedAttempts,
  firstOpenIndex,
  fromBankItem,
  initialAnswerPracticeState,
  recordAttempt,
  selectWeakQueue,
  uniquePracticeQueue,
  type AnswerPracticeEvent,
  type AnswerPracticePreset,
  type PracticeQuestion,
  type PracticeRun,
  type PracticeSource,
} from "@/lib/answer-practice"
import { getUserId } from "@/lib/auth-store"
import { dateKeyInTimeZone } from "@/lib/date-key"
import { parseStoredQueueIds } from "@/lib/exam-prep-home"
import { INTERVIEW_TOPICS } from "@/lib/interview"
import {
  DRILL_SIZE,
  LISTENING_LEVELS,
  buildDrillQueue,
  pickStyleExamples,
  replaceUnseenTail,
} from "@/lib/interview-drills"
import {
  INTERVIEW_TIME_ZONE,
  daysRemainingInSeoul,
  recommendedDifficulty,
  selectTodaysQueue,
  todayQueueStorageKey,
  type PracticeDifficulty,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"
import { stopSpeechAudio } from "@/lib/speech-audio"
import { EXAM_DATE } from "@/lib/study-plan"

// Legacy per-drill "last session" summaries; kept so existing keys stay fed.
const LAST_SESSION_KEYS: Record<AnswerPracticePreset, string> = {
  speaking: "kori.drill.speaking.last",
  listening: "kori.drill.listening.last",
}
// The Exam Prep home links here with ?start=today; the session always starts
// Today's 5 now, so the param is simply removed from the address bar.
const START_PARAM = "start"
const SPEAKING_AI_HINT =
  "natural habits-and-hobbies interview phrasing for a beginner answer of 2-3 sentences"

const DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  beginner: "Beginner",
  normal: "Normal",
  challenging: "Challenging",
  mixed: "Mixed exam",
}

function writeLastSession(preset: AnswerPracticePreset, value: unknown) {
  try {
    window.localStorage.setItem(LAST_SESSION_KEYS[preset], JSON.stringify(value))
  } catch {
    // The summary still renders for this session.
  }
}

/**
 * The unified Exam Prep practice — Listen → Answer → Review → Retry — behind
 * both /interview/speaking (checks by default) and /interview/listening
 * (audio-only until review, compare by default). Replaces the separate
 * Speaking and Listening drills.
 */
export function AnswerPracticeSession({ preset }: { preset: AnswerPracticePreset }) {
  const cfg = ANSWER_PRACTICE_PRESETS[preset]
  const topic = INTERVIEW_TOPICS[0]
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")
  const queryClient = useQueryClient()
  const userId = getUserId()

  const questionsQuery = useQuery({
    queryKey: interviewQuestionsQueryKey(userId, topic.id),
    queryFn: () => interviewApi.listQuestions(topic.id),
    enabled: userId != null,
    staleTime: 0,
    refetchOnMount: "always",
  })
  const progressQuery = useQuery({
    queryKey: interviewProgressQueryKey(userId),
    queryFn: interviewApi.listQuestionProgress,
    enabled: userId != null,
    staleTime: 0,
    refetchOnMount: "always",
  })
  const bank = questionsQuery.data
  const progress = progressQuery.data

  const recommended = recommendedDifficulty(daysRemainingInSeoul(EXAM_DATE))
  const [settings, setSettings] = useState<PracticeSettings>({
    source: "today",
    difficulty: recommended,
    listeningLevel: "medium",
  })
  const level = LISTENING_LEVELS[settings.listeningLevel]

  const [view, setView] = useState<"practice" | "bank" | "summary">("practice")
  const [source, setSource] = useState<PracticeSource>("today")
  const [queue, setQueue] = useState<PracticeQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [runs, setRuns] = useState<PracticeRun[]>([])
  const [machine, setMachine] = useState(initialAnswerPracticeState)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [setupError, setSetupError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "failed">("idle")
  const [addingMore, setAddingMore] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingSettings, setPendingSettings] = useState<PracticeSettings | null>(null)
  const sessionIdRef = useRef("")
  const indexRef = useRef(0)
  useEffect(() => {
    indexRef.current = index
  }, [index])
  useScrollToTopOnChange(view)

  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })
  const answerMode = useAnswerMode(speech)

  const send = useCallback(
    (event: AnswerPracticeEvent) => setMachine((state) => answerPracticeReducer(state, event, cfg)),
    [cfg],
  )

  const question = queue?.[index]
  const run = question
    ? runs.find((r) => (r.question.id ?? r.question.ko) === (question.id ?? question.ko))
    : undefined
  const answering =
    machine.phase === "listen" || machine.phase === "answer" || machine.phase === "retry"
  const answer = speech.transcript.trim()

  // Losing an unsubmitted answer is the only real loss: checked answers are saved.
  useLeaveGuard(view === "practice" && answering && answer.length > 0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has(START_PARAM)) return
    params.delete(START_PARAM)
    const query = params.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
  }, [])

  useEffect(
    () => () => {
      stopSpeechAudio()
    },
    [],
  )

  // ── Starting a set ──────────────────────────────────────────────────────

  function launch(next: PracticeQuestion[], nextSource: PracticeSource, startIndex = 0) {
    const unique = uniquePracticeQueue(next, DRILL_SIZE + 3)
    if (unique.length === 0) {
      setSetupError("No questions are available for this choice yet.")
      return false
    }
    stopSpeechAudio()
    speech.reset()
    sessionIdRef.current = crypto.randomUUID()
    setSetupError("")
    setSaveError("")
    setAiStatus("idle")
    setQueue(unique)
    setIndex(Math.min(Math.max(0, startIndex), unique.length - 1))
    setRuns([])
    setMachine(initialAnswerPracticeState())
    setAudioPlaying(false)
    setSource(nextSource)
    setView("practice")
    return true
  }

  function startToday(
    difficulty: PracticeDifficulty,
    items: QuestionBankItem[],
    currentProgress: Record<string, QuestionProgress>,
    resume: boolean,
  ) {
    const storageKey = todayQueueStorageKey(
      dateKeyInTimeZone(new Date(), INTERVIEW_TIME_ZONE),
      difficulty,
    )
    let storedIds: string[] = []
    try {
      storedIds = parseStoredQueueIds(window.localStorage.getItem(storageKey))
    } catch {
      storedIds = []
    }
    const selected = selectTodaysQueue(items, currentProgress, difficulty, DRILL_SIZE, storedIds)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selected.map((q) => q.id)))
    } catch {
      // The deterministic order stays stable when storage is unavailable.
    }
    const next = selected.map(fromBankItem)
    launch(next, "today", resume ? firstOpenIndex(next, currentProgress) : 0)
  }

  function startAi(listeningLevel = settings.listeningLevel) {
    // Prepared questions start instantly; AI questions replace the unseen
    // tail when they arrive, so a slow or failed call never blocks practice.
    const prepared: PracticeQuestion[] = buildDrillQueue()
    if (!launch(prepared, "ai")) return
    const sessionId = sessionIdRef.current
    setAiStatus("loading")
    interviewApi
      .drillQuestions({
        kind: preset,
        count: DRILL_SIZE,
        complexityHint:
          preset === "listening"
            ? LISTENING_LEVELS[listeningLevel].complexityHint
            : SPEAKING_AI_HINT,
        styleExamples: pickStyleExamples(),
        avoid: prepared.map((q) => q.ko),
      })
      .then(({ questions }) => {
        if (sessionIdRef.current !== sessionId) return
        if (questions.length === 0) {
          setAiStatus("failed")
          return
        }
        setQueue((current) =>
          current
            ? uniquePracticeQueue(
                replaceUnseenTail<PracticeQuestion>(current, questions, indexRef.current + 1),
                DRILL_SIZE + 3,
              )
            : current,
        )
        setAiStatus("idle")
      })
      .catch(() => {
        if (sessionIdRef.current === sessionId) setAiStatus("failed")
      })
  }

  function applySettings(next: PracticeSettings) {
    setSettings(next)
    setSheetOpen(false)
    setPendingSettings(null)
    if (next.source === "ai") {
      startAi(next.listeningLevel)
      return
    }
    if (!bank || !progress) return
    if (next.source === "weak") {
      launch(selectWeakQueue(bank, progress, DRILL_SIZE).map(fromBankItem), "weak")
    } else {
      startToday(next.difficulty, bank, progress, true)
    }
  }

  function requestSettings(next: PracticeSettings) {
    if (view === "practice" && runs.length > 0) {
      setSheetOpen(false)
      setPendingSettings(next)
    } else {
      applySettings(next)
    }
  }

  function practiceAgain() {
    if (source === "ai") startAi()
    else if (source === "selected" && queue) launch(queue, "selected")
    else applySettings({ ...settings, source: source === "weak" ? "weak" : "today" })
  }

  // Open straight into Today's 5, resuming at the first question not done today.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current || !bank || !progress) return
    autoStarted.current = true
    if (bank.length > 0) startToday(settings.difficulty, bank, progress, true)
    // Runs once, when the bank first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, progress])

  // ── Per-question actions ────────────────────────────────────────────────

  function takeAnswer(): string {
    return (speech.status === "listening" ? speech.stop() : speech.transcript).trim()
  }

  async function check() {
    const reviewingCompared = machine.phase === "review" && machine.review === "compared"
    // Only answers being given, or one just compared, can be checked.
    if (!question || !(answering || reviewingCompared)) return
    const text = reviewingCompared ? (run?.attempts.at(-1)?.answer ?? "") : takeAnswer()
    if (!text) {
      speech.setError("Record or type a complete Korean answer before checking it.")
      return
    }
    if (machine.phase === "listen") send({ type: "skip-listen" })
    send({ type: "submit" })
    setSaveError("")
    let result
    try {
      result = await interviewApi.speakingCheck({ question: question.ko, answer: text })
    } catch (error) {
      send({
        type: "check-failed",
        message: getApiErrorMessage(
          error,
          "Couldn't check this answer. Your answer is kept — try again.",
        ),
      })
      return
    }
    setRuns((current) =>
      recordAttempt(current, question, { answer: text, review: "checked", result }),
    )
    send({ type: "check-succeeded" })
    void logActivity()
    try {
      await interviewApi.saveAnswer({
        questionId: question.id ?? null,
        sessionType: cfg.sessionType,
        sessionId: sessionIdRef.current,
        questionKo: question.ko,
        answerText: text,
        scores: result.scores,
        feedback: result.feedback,
        correctedAnswer: result.correctedAnswer,
        naturalAlternative: result.betterAlternative,
        tip: result.tip,
      })
      if (question.id) {
        void queryClient.invalidateQueries({ queryKey: interviewProgressQueryKey(userId) })
      }
    } catch (error) {
      setSaveError(
        getApiErrorMessage(error, "Checked, but this answer couldn't be saved to your progress."),
      )
    }
  }

  function compare() {
    if (!question || !answering) return
    const text = takeAnswer()
    if (machine.phase === "listen") send({ type: "skip-listen" })
    setRuns((current) => recordAttempt(current, question, { answer: text, review: "compared" }))
    send({ type: "compare" })
    void logActivity()
  }

  function retry() {
    stopSpeechAudio()
    speech.reset()
    setSaveError("")
    send({ type: "retry" })
  }

  function finish() {
    stopSpeechAudio()
    speech.reset()
    const checked = runs.filter((r) => checkedAttempts(r).length > 0)
    writeLastSession(
      preset,
      preset === "listening"
        ? {
            finishedAt: new Date().toISOString(),
            level: settings.listeningLevel,
            total: runs.length,
            answered: runs.filter((r) => r.attempts.some((a) => a.answer)).length,
          }
        : { finishedAt: new Date().toISOString(), answered: runs.length, checked: checked.length },
    )
    setView("summary")
  }

  function next() {
    if (!queue) return
    stopSpeechAudio()
    speech.reset()
    setSaveError("")
    setMachine(initialAnswerPracticeState())
    setAudioPlaying(false)
    if (index + 1 >= queue.length) {
      finish()
      return
    }
    setIndex(index + 1)
  }

  async function moreLikeThis() {
    if (!queue) return
    setAddingMore(true)
    try {
      const { questions } = await interviewApi.drillQuestions({
        kind: preset,
        count: 3,
        complexityHint: preset === "listening" ? level.complexityHint : SPEAKING_AI_HINT,
        styleExamples: pickStyleExamples(),
        avoid: queue.map((q) => q.ko),
      })
      if (questions.length > 0) {
        const startAt = queue.length
        setQueue([...queue, ...questions])
        setIndex(startAt)
        setMachine(initialAnswerPracticeState())
        speech.reset()
        setView("practice")
      }
    } catch {
      setAiStatus("failed")
    } finally {
      setAddingMore(false)
    }
  }

  function onPlaybackEnded() {
    send({ type: "audio-ended" })
    if (
      cfg.autoListen &&
      answerMode.canAutoListen &&
      speech.status !== "listening" &&
      (machine.phase === "listen" || machine.phase === "answer")
    ) {
      speech.start()
    }
  }

  // ── Views ───────────────────────────────────────────────────────────────

  const sheet = (
    <PracticeSourceSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      current={settings}
      recommended={recommended}
      weakAvailable={
        Boolean(bank && progress) && selectWeakQueue(bank ?? [], progress ?? {}, 1).length > 0
      }
      showListeningLevel={preset === "listening"}
      onApply={requestSettings}
      onBrowseBank={() => {
        setSheetOpen(false)
        setView("bank")
      }}
    />
  )

  const confirmDialog = (
    <AlertDialog
      open={pendingSettings !== null}
      onOpenChange={(open) => !open && setPendingSettings(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new set?</AlertDialogTitle>
          <AlertDialogDescription>
            Answers you checked are already saved. Compared answers and this set&apos;s summary
            won&apos;t carry over.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <AlertDialogAction onClick={() => pendingSettings && applySettings(pendingSettings)}>
            Start new set
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (view === "bank") {
    return (
      <QuestionBankBrowser
        questions={bank ?? []}
        progress={progress ?? {}}
        onBack={() => setView("practice")}
        onPractice={(selected) => launch(selected.map(fromBankItem), "selected")}
      />
    )
  }

  if (view === "summary") {
    return (
      <>
        <PracticeSummary
          runs={runs}
          onPracticeAgain={practiceAgain}
          onMoreLikeThis={source === "ai" ? moreLikeThis : undefined}
          addingMore={addingMore}
        />
        {sheet}
      </>
    )
  }

  // Before the first set: loading, error, or an empty bank.
  if (!queue || !question) {
    const failed = questionsQuery.isError || progressQuery.isError
    const empty = bank !== undefined && bank.length === 0
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-16">
        <BackToExamPrep />
        {failed ? (
          <div role="alert" className="app-surface space-y-3 p-5">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
              Couldn&apos;t load your question bank.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                void questionsQuery.refetch()
                void progressQuery.refetch()
              }}
              className="h-11"
            >
              <RotateCcw aria-hidden="true" /> Retry
            </Button>
          </div>
        ) : empty || setupError ? (
          <div className="app-surface space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              {setupError || "Your question bank is empty, so there's nothing to practice yet."}
            </p>
            <Button variant="outline" onClick={() => startAi()} className="h-11">
              Practice with AI questions
            </Button>
          </div>
        ) : (
          <div className="space-y-3" aria-busy="true" aria-label="Loading your questions">
            <div className="h-6 w-1/3 animate-pulse rounded-md bg-muted" />
            <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        )}
        {sheet}
      </div>
    )
  }

  const total = queue.length
  const checked = run ? checkedAttempts(run) : []
  const lastAttempt = run?.attempts.at(-1)
  const isLast = index + 1 >= total
  const sourceDetail =
    source === "today"
      ? `${PRACTICE_SOURCE_LABELS.today} · ${DIFFICULTY_LABELS[settings.difficulty]}`
      : PRACTICE_SOURCE_LABELS[source]
  const checking = machine.phase === "checking"

  const checkButton = (primary: boolean) => (
    <Button
      type="button"
      size="lg"
      variant={primary ? "default" : "outline"}
      onClick={() => void check()}
      disabled={!answer || checking || audioPlaying}
      className="h-11 w-full sm:h-12 sm:w-auto sm:flex-1"
    >
      {checking ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" /> Checking…
        </>
      ) : (
        <>
          <Send aria-hidden="true" /> Check my answer
        </>
      )}
    </Button>
  )
  const compareButton = (primary: boolean) => (
    <Button
      type="button"
      size="lg"
      variant={primary ? "default" : "outline"}
      onClick={compare}
      disabled={checking}
      className="h-11 w-full sm:h-12 sm:w-auto sm:flex-1"
    >
      <Eye aria-hidden="true" /> {preset === "listening" ? "Reveal & compare" : "Just compare"}
    </Button>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-36 sm:pb-24">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackToExamPrep />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} className="h-10">
              <SlidersHorizontal aria-hidden="true" /> Change questions
            </Button>
            <Button variant="ghost" size="sm" onClick={finish} className="h-10">
              Finish
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {preset === "listening" ? "Listening practice" : "Answer practice"}
            </span>{" "}
            · {sourceDetail}
            {preset === "listening" && ` · ${level.label}`}
          </p>
          <span className="tabular-nums text-muted-foreground">
            {index + 1} / {total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Practice set progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-valuetext={`Question ${index + 1} of ${total}`}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        {aiStatus === "loading" && (
          <p role="status" className="text-xs text-muted-foreground">
            Generating AI questions — starting with prepared ones.
          </p>
        )}
        {aiStatus === "failed" && (
          <p role="status" className="text-xs text-muted-foreground">
            AI questions are unavailable right now, so this set uses prepared questions.
          </p>
        )}
      </div>

      <PracticeQuestionCard
        question={question}
        questionNumber={index + 1}
        total={total}
        resetKey={`${sessionIdRef.current}:${question.id ?? question.ko}`}
        textRevealed={machine.textRevealed}
        canRevealText={cfg.allowEarlyReveal || machine.phase === "review"}
        onRevealText={() => send({ type: "reveal-text" })}
        allowEnglish={level.showEnglishOnReveal}
        allowSlow={level.allowSlowReplay}
        maxPlays={level.maxPlays}
        onPlayingChange={setAudioPlaying}
        onPlaybackEnded={onPlaybackEnded}
      />

      {machine.phase === "review" && machine.review === "checked" && checked[0]?.result ? (
        <CorrectionRetryPanel
          questionId={question.id ?? question.ko}
          firstAnswer={checked[0].answer}
          firstResult={checked[0].result}
          retryAnswer={checked.length > 1 ? checked.at(-1)!.answer : undefined}
          retryResult={checked.length > 1 ? checked.at(-1)!.result : undefined}
          onRetry={retry}
          onNext={next}
          isLast={isLast}
        />
      ) : machine.phase === "review" && machine.review === "compared" ? (
        <>
          <CompareReviewCard
            question={question}
            showEnglish={level.showEnglishOnReveal}
            userAnswer={lastAttempt?.answer || undefined}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {lastAttempt?.answer ? (
              <Button size="lg" onClick={() => void check()} className="h-12">
                <Send aria-hidden="true" /> Get AI feedback
              </Button>
            ) : null}
            <Button size="lg" variant="outline" onClick={retry} className="h-12">
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
            <Button size="lg" variant="ghost" onClick={next} className="h-12">
              {isLast ? "Finish set" : "Next question"} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </>
      ) : (
        <section aria-label="Answer" className="app-surface space-y-4 p-4 sm:p-6">
          {preset === "speaking" && <AnswerFrameHint />}
          <AnswerInput
            speech={speech}
            mode={answerMode}
            disabled={checking}
            audioPlaying={audioPlaying}
            placeholder={
              preset === "listening"
                ? "Type what you'd answer — or what you heard…"
                : "Type your Korean answer…"
            }
          />
        </section>
      )}

      {(machine.error || saveError) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {machine.error || saveError}
        </p>
      )}

      {(answering || checking) && (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={next}
            disabled={checking}
            className="h-11 w-full text-sm text-muted-foreground"
          >
            Skip this question
          </Button>
          <StickyActionBar label="Answer actions" pinned={answer.length > 0 || checking}>
            {cfg.primaryReview === "check" ? (
              <>
                {checkButton(true)}
                {compareButton(false)}
              </>
            ) : (
              <>
                {compareButton(true)}
                {checkButton(false)}
              </>
            )}
          </StickyActionBar>
        </>
      )}

      {sheet}
      {confirmDialog}
    </div>
  )
}

function BackToExamPrep() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 h-10">
      <Link href="/interview">
        <ArrowLeft aria-hidden="true" /> Exam Prep
      </Link>
    </Button>
  )
}
