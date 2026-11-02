"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Award,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Loader2,
  Mic,
  PencilLine,
  RotateCcw,
  Send,
  Sparkles,
  Waves,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"

import { DrillEntryCards } from "@/components/interview/DrillEntryCards"
import { EvaluationSummary } from "@/components/interview/EvaluationSummary"
import { ExamTimer } from "@/components/interview/ExamTimer"
import { InterviewProgressCard } from "@/components/interview/InterviewProgressCard"
import { ModePicker } from "@/components/interview/ModePicker"
import { SpeakingTipsCard } from "@/components/interview/SpeakingTipsCard"
import { StudyPack } from "@/components/interview/StudyPack"
import { StudyPlanCard } from "@/components/interview/StudyPlanCard"
import { LearnHeader } from "@/components/learn/LearnHeader"
import { SpeakButton } from "@/components/ui/SpeakButton"
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
import { Badge } from "@/components/ui/badge"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { useLeaveGuard } from "@/hooks/useLeaveGuard"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { chatApi, getApiErrorMessage, interviewApi, ttsApi } from "@/lib/api"
import type { TranscriptEntry } from "@/lib/api/interview"
import {
  buildAnswerMessage,
  buildEvaluationPrompt,
  buildInterviewSystemPrompt,
  INTERVIEW_TOPICS,
  parseEvaluation,
  parseExaminerTurn,
  toEvaluationScores,
  type ExaminerTurn,
  type InterviewAnalytics,
  type InterviewEvaluation,
} from "@/lib/interview"
import { INTERVIEW_MODES, type InterviewMode } from "@/lib/interview-modes"
import { sampleUnexpectedQuestions } from "@/lib/interview-unexpected"
import {
  loadScorecards,
  mergeScorecards,
  saveScorecard,
  toScorecardRecord,
  type ScorecardRecord,
} from "@/lib/interview-history"
import { registerSpeechAudio, stopSpeechAudio } from "@/lib/speech-audio"
import { EXAM_DATE_LABEL } from "@/lib/study-plan"
import { cn } from "@/lib/utils"

type SessionEntry =
  | { id: string; kind: "examiner"; turn: ExaminerTurn }
  | { id: string; kind: "answer"; text: string }

// recharts-backed; deferred so the page paints before the chart chunk loads.
const ScoreTrend = dynamic(
  () => import("@/components/interview/ScoreTrend").then((m) => m.ScoreTrend),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-3xl bg-muted/20" />,
  },
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} as const

// Auto-play the examiner question. iOS Safari may block playback that isn't a
// direct tap — failures are swallowed and the candidate uses the speaker button.
// Resolves true only once playback finished, so callers can chain the
// hands-free mic without ever capturing the examiner's own voice.
async function autoSpeak(text: string): Promise<boolean> {
  if (!text) return false
  let url: string | undefined
  let stopAudio: (() => void) | undefined
  try {
    url = await ttsApi.speak(text)
    const audio = new Audio(url)
    // ttsApi.speak hands back an object URL — release it once playback ends or
    // errors, otherwise every spoken question leaks a blob for the whole session.
    const done = new Promise<boolean>((resolve) => {
      stopAudio = registerSpeechAudio(audio, () => {
        if (url) URL.revokeObjectURL(url)
        url = undefined
        resolve(audio.ended)
      })
    })
    await audio.play()
    return await done
  } catch {
    // Autoplay blocked or TTS unavailable — manual playback still works.
    // play() never started, so revoke the URL now rather than on an event.
    stopAudio?.()
    if (url) URL.revokeObjectURL(url)
    return false
  }
}

export default function InterviewPage() {
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")

  const [phase, setPhase] = useState<"select" | "session" | "summary">("select")
  const [mode, setMode] = useState<InterviewMode>("practice")
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const [current, setCurrent] = useState<ExaminerTurn | null>(null)
  const [streamingText, setStreamingText] = useState("")
  const [isExaminerThinking, setIsExaminerThinking] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [isEditingAnswer, setIsEditingAnswer] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [error, setError] = useState("")
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null)
  const [analytics, setAnalytics] = useState<InterviewAnalytics | null>(null)
  // Exam-mode countdown target (epoch ms); null when untimed.
  const [endsAt, setEndsAt] = useState<number | null>(null)
  // Past scorecards — localStorage first (instant), merged with the Supabase
  // attempts once they arrive so history syncs across devices.
  const [history, setHistory] = useState<ScorecardRecord[]>(loadScorecards)
  useScrollToTopOnChange(phase)

  // Continuous capture: the mic stays open across pauses (exam answers are
  // 2–3 sentences) until the candidate stops it or submits.
  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })
  const conversationRef = useRef<string | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  // Guards the hands-free auto-listen: question audio can still be playing
  // when the candidate ends the session, and the mic must not open then.
  const sessionActiveRef = useRef(false)

  const topic = INTERVIEW_TOPICS[0]
  const cfg = INTERVIEW_MODES[mode]

  // Merge remote attempt history into the local trend. Best-effort: offline or
  // pre-migration accounts just keep the local copy.
  useEffect(() => {
    let active = true
    interviewApi
      .listAttempts()
      .then((attempts) => {
        if (!active || attempts.length === 0) return
        setHistory(mergeScorecards(loadScorecards(), attempts.map(toScorecardRecord)))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      sessionActiveRef.current = false
      stopSpeechAudio()
    },
    [],
  )

  // A live session exists only in this page's state: a reload or tab close
  // would end it silently, so ask first once something has been answered.
  const hasAnswers = entries.some((entry) => entry.kind === "answer")
  useLeaveGuard(phase === "session" && hasAnswers)
  const [confirmEnd, setConfirmEnd] = useState(false)
  // Ending the session drops its transcript, so confirm once there's
  // something to lose.
  function requestEndSession() {
    if (hasAnswers) setConfirmEnd(true)
    else endSession()
  }

  // Streams one examiner turn, then parses it into question + feedback and
  // speaks the Korean question aloud.
  async function runExaminerTurn(message: string) {
    const convId = conversationRef.current
    if (!convId) return

    setIsExaminerThinking(true)
    setStreamingText("")
    setShowEnglish(false)
    setError("")

    let buffer = ""
    try {
      await chatApi.streamMessage(
        convId,
        message,
        (token) => {
          buffer += token
          setStreamingText(buffer)
        },
        () => {},
        () => {},
      )

      const turn = parseExaminerTurn(buffer)
      setCurrent(turn)
      setEntries((prev) => [...prev, { id: crypto.randomUUID(), kind: "examiner", turn }])
      setQuestionCount((count) => count + 1)
      setStreamingText("")
      void logActivity()
      // Hands-free loop: once the examiner finishes speaking, open the mic so
      // the candidate just answers — listen, speak, submit, repeat.
      void autoSpeak(turn.questionKo).then((played) => {
        if (played && sessionActiveRef.current) speech.start()
      })
    } catch (err) {
      setError(getApiErrorMessage(err, "The examiner could not respond. Try again."))
      setStreamingText("")
    } finally {
      setIsExaminerThinking(false)
    }
  }

  async function startSession() {
    setError("")
    setIsExaminerThinking(true)
    try {
      const data = await chatApi.createConversation(
        `Mock Interview (${cfg.label}) · ${topic.label}`,
        "FREE_CHAT",
      )
      conversationRef.current = data.id
      sessionStartRef.current = Date.now()
      setEntries([])
      setCurrent(null)
      setQuestionCount(0)
      setEvaluation(null)
      setAnalytics(null)
      setEndsAt(cfg.durationSeconds ? Date.now() + cfg.durationSeconds * 1000 : null)
      speech.reset()
      sessionActiveRef.current = true
      setPhase("session")
      const unexpected = sampleUnexpectedQuestions(cfg.unexpectedQuestionCount)
      await runExaminerTurn(buildInterviewSystemPrompt(topic, cfg, unexpected))
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start the interview. Is the backend running?"))
      setIsExaminerThinking(false)
      setPhase("select")
    }
  }

  function submitAnswer() {
    const answer = (speech.status === "listening" ? speech.stop() : speech.transcript).trim()
    if (!answer || isExaminerThinking) return

    setEntries((prev) => [...prev, { id: crypto.randomUUID(), kind: "answer", text: answer }])
    speech.reset()
    setIsEditingAnswer(false)
    void runExaminerTurn(buildAnswerMessage(answer, cfg))
  }

  // Ends the Q&A and asks for a final scorecard against the four exam criteria.
  // Primary path: the structured evaluate route (richer analytics). Fallback:
  // the original chat-stream scorecard, so an AI-route outage never eats a
  // finished interview. The result is saved locally AND to Supabase under one
  // shared id so merged reads dedupe.
  async function finishInterview() {
    const convId = conversationRef.current
    if (!convId || isEvaluating || isExaminerThinking) return

    setError("")
    setIsEvaluating(true)
    sessionActiveRef.current = false
    speech.stop()

    const transcript: TranscriptEntry[] = entries.map((entry) =>
      entry.kind === "examiner"
        ? { role: "examiner", text: entry.turn.questionKo }
        : { role: "candidate", text: entry.text },
    )
    const answeredCount = transcript.filter((t) => t.role === "candidate").length
    const durationSeconds = sessionStartRef.current
      ? Math.round((Date.now() - sessionStartRef.current) / 1000)
      : 0

    let parsed: InterviewEvaluation | null = null
    let parsedAnalytics: InterviewAnalytics | null = null
    try {
      const result = await interviewApi.evaluate({
        topicId: topic.id,
        mode: cfg.id,
        transcript,
        questionCount: answeredCount,
        durationSeconds,
      })
      parsed = {
        scores: toEvaluationScores(result.scores),
        summary: result.summary,
        advice: result.advice,
      }
      parsedAnalytics = result.analytics
    } catch {
      // Structured route unavailable — fall back to the original chat-stream
      // scorecard (no analytics). Errors here surface to the candidate below.
      try {
        let buffer = ""
        await chatApi.streamMessage(
          convId,
          buildEvaluationPrompt(),
          (token) => {
            buffer += token
          },
          () => {},
          () => {},
        )
        parsed = parseEvaluation(buffer)
      } catch (err) {
        setError(getApiErrorMessage(err, "Could not generate your evaluation. Try again."))
      }
    }

    if (parsed) {
      setEvaluation(parsed)
      setAnalytics(parsedAnalytics)
      // Dual-write under one id: localStorage keeps the instant/offline trend,
      // Supabase makes it durable and cross-device. Remote failure is silent —
      // the local copy already has it.
      const attemptId = crypto.randomUUID()
      setHistory(saveScorecard(parsed, new Date(), attemptId, cfg.id))
      if (parsed.scores.length > 0) {
        interviewApi
          .saveAttempt({
            id: attemptId,
            mode: cfg.id,
            topicId: topic.id,
            scores: parsed.scores,
            overall:
              parsed.scores.reduce((sum, s) => sum + (s.score / s.max) * 5, 0) /
              parsed.scores.length,
            summary: parsed.summary,
            advice: parsed.advice,
            analytics: parsedAnalytics,
            questionCount: answeredCount,
            durationSeconds,
          })
          .catch((err) => console.warn("Could not sync interview attempt:", err))
      }
      setEndsAt(null)
      setPhase("summary")
      void logActivity()
    } else {
      // Evaluation failed on both paths — the session stays live, so re-arm
      // the hands-free mic guard.
      sessionActiveRef.current = true
    }
    setIsEvaluating(false)
  }

  function endSession() {
    sessionActiveRef.current = false
    stopSpeechAudio()
    speech.reset()
    conversationRef.current = null
    sessionStartRef.current = null
    setEntries([])
    setCurrent(null)
    setStreamingText("")
    setQuestionCount(0)
    setEvaluation(null)
    setAnalytics(null)
    setEndsAt(null)
    setPhase("select")
  }

  // ── Topic selection ──────────────────────────────────────────────
  if (phase === "select") {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6 pb-12 sm:space-y-8"
      >
        <motion.div variants={itemVariants}>
          <LearnHeader
            description={`K-Specialist spoken Q&A · exam ${EXAM_DATE_LABEL} · intro + Q&A, judged on speaking. The AI examiner asks one question at a time and probes with follow-ups.`}
          />
        </motion.div>

        {/* Preparation in one card: topic, mode, and Start — above the fold. */}
        <motion.section
          variants={itemVariants}
          aria-labelledby="exam-topic-heading"
          className="app-surface space-y-5 border-primary/30 p-5 sm:p-6"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-md text-xs">
                Your topic
              </Badge>
              <Badge variant="outline" className="rounded-md text-xs">
                {topic.difficulty}
              </Badge>
            </div>
            <h2
              id="exam-topic-heading"
              lang="ko"
              className="mt-3 text-xl font-bold leading-snug text-foreground"
            >
              {topic.labelKo}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {topic.description}
            </p>
          </div>

          {/* Practice vs Exam Simulation */}
          <ModePicker value={mode} onChange={setMode} />

          {error && <ErrorBanner message={error} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={startSession}
              disabled={isExaminerThinking}
              className="h-12 w-full sm:w-auto sm:px-8"
            >
              {isExaminerThinking ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" /> Starting…
                </>
              ) : (
                <>
                  <GraduationCap aria-hidden="true" />
                  {mode === "exam" ? "Start exam simulation" : "Start interview"}
                </>
              )}
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto">
              <Link href="/interview/script">
                <FileText aria-hidden="true" /> Write my script
              </Link>
            </Button>
          </div>
        </motion.section>

        {/* Daily drills — quick reps between full mocks */}
        <motion.div variants={itemVariants}>
          <DrillEntryCards />
        </motion.div>

        {/* Reference material, collapsed so it doesn't push Start down. */}
        <motion.div variants={itemVariants}>
          <Collapsible className="app-surface">
            <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Progress & study materials
                </span>
                <span className="block text-xs text-muted-foreground">
                  Score trend, study plan, speaking tips, and the topic study pack
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 border-t border-border p-4 sm:p-5">
              {/* Renders itself only after mount + when scorecards exist. */}
              <ScoreTrend records={history} />
              <InterviewProgressCard topicId={topic.id} />
              <StudyPlanCard />
              <SpeakingTipsCard />
              {topic.prep && <StudyPack topic={topic} />}
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      </motion.div>
    )
  }

  // ── Evaluation summary ───────────────────────────────────────────
  if (phase === "summary" && evaluation) {
    return (
      <EvaluationSummary
        mode={cfg}
        evaluation={evaluation}
        analytics={analytics}
        history={history}
        onPracticeAgain={startSession}
        onBackToTopics={endSession}
      />
    )
  }

  // ── Live session ─────────────────────────────────────────────────
  const recording = speech.status === "listening"
  const answeredCount = entries.filter((entry) => entry.kind === "answer").length

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 pb-12 sm:space-y-6"
    >
      {/* Compact session bar — active practice, not a page hero. */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="app-kicker">
              Mock interview · {cfg.label} · Question {Math.max(questionCount, 1)}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{topic.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            {endsAt !== null && <ExamTimer endsAt={endsAt} onExpire={finishInterview} />}
            <Button variant="outline" onClick={requestEndSession}>
              <RotateCcw aria-hidden="true" /> End session
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {cfg.showEnglish
            ? "Listen to each question, then answer out loud in Korean. Reveal the English only if you need it."
            : "Exam conditions: Korean only, no feedback until the end. Listen, think, answer."}
          {!speech.supported && " Voice capture isn't available here — type your answers."}
        </p>
        <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End this session?</AlertDialogTitle>
              <AlertDialogDescription>
                Your {answeredCount} {answeredCount === 1 ? "answer" : "answers"} so far won&apos;t
                be scored or saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={endSession}
              >
                End session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>

      {/* Current question */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
          <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                <GraduationCap size={20} strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Examiner</CardTitle>
                <p className="text-xs font-medium text-muted-foreground">
                  Question {Math.max(questionCount, 1)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            {/* Feedback on the previous answer (practice mode only) */}
            {cfg.showFeedback && current?.feedback && (
              <div className="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                  <Sparkles size={14} strokeWidth={3} />
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground/90">
                  {current.feedback}
                </p>
              </div>
            )}

            {/* Question text */}
            <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-accent/5 p-5 sm:rounded-3xl sm:p-6">
              {isExaminerThinking && !streamingText ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-bold">The examiner is thinking…</span>
                </div>
              ) : (
                <>
                  <p
                    lang="ko"
                    className="break-keep text-[1.5rem] font-bold leading-tight text-foreground sm:text-2xl lg:text-[1.7rem]"
                  >
                    {streamingText
                      ? parseExaminerTurn(streamingText).questionKo
                      : current?.questionKo}
                  </p>

                  {current && !streamingText && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-background p-1.5 shadow-sm">
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-accent">
                          <SpeakButton text={current.questionKo} className="p-0" />
                          <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                            Normal
                          </span>
                        </div>
                        {cfg.allowSlowReplay && (
                          <>
                            <div className="mx-1 h-4 w-px bg-border" />
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-accent">
                              <SpeakButton
                                text={current.questionKo}
                                className="p-0"
                                playbackRate={0.75}
                              />
                              <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                                Slow
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {cfg.showEnglish && current.questionEn && (
                        <Button
                          variant="outline"
                          onClick={() => setShowEnglish((v) => !v)}
                          className="h-11 rounded-2xl border-border bg-background px-4 font-bold hover:bg-accent"
                        >
                          {showEnglish ? (
                            <>
                              <EyeOff size={16} className="mr-2" /> Hide English
                            </>
                          ) : (
                            <>
                              <Eye size={16} className="mr-2" /> Show English
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {cfg.showEnglish && showEnglish && current?.questionEn && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 text-sm font-medium italic leading-relaxed text-muted-foreground"
                      >
                        {current.questionEn}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {error && <ErrorBanner message={error} />}
          </CardContent>
        </Card>
      </motion.div>

      {/* Answer area */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
          <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                  <Waves size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Your Answer</CardTitle>
                  <p className="text-xs font-medium text-muted-foreground">
                    Speak in Korean, then submit.
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "rounded-lg border-none px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
                  recording ? "animate-pulse bg-rose-500 text-white" : "bg-accent/20",
                )}
              >
                {recording ? "Recording…" : speech.transcript ? "Captured" : "Ready"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full rounded-2xl sm:w-fit">
                {recording ? (
                  <BorderBeam
                    size={64}
                    duration={1.8}
                    colorFrom="#fb7185"
                    colorTo="#fbbf24"
                    borderWidth={2}
                  />
                ) : null}
                <Button
                  onClick={() => (recording ? speech.stop() : speech.start())}
                  disabled={isExaminerThinking}
                  aria-pressed={recording}
                  className={cn(
                    "h-12 w-full rounded-2xl px-6 text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 sm:h-14 sm:w-auto sm:px-8 sm:text-base",
                    recording
                      ? "bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {recording ? (
                    <>
                      <Waves size={20} className="mr-2 animate-pulse" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic size={20} className="mr-2" /> Record Answer
                    </>
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsEditingAnswer((v) => !v)}
                disabled={recording || isExaminerThinking}
                className="h-12 w-full rounded-2xl border-border bg-background px-6 font-bold hover:bg-accent active:scale-95 sm:h-14 sm:w-auto"
              >
                <PencilLine size={18} className="mr-2" />
                {isEditingAnswer ? "Done" : "Manual Edit"}
              </Button>
            </div>

            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-muted-foreground"
            >
              {recording
                ? "Listening now — pauses are okay. Tap Stop when your answer is complete."
                : "The microphone opens after the examiner finishes speaking; you can also start it manually."}
            </p>

            {/* Transcript */}
            <div className="rounded-[1.5rem] border border-border bg-background p-4 shadow-sm sm:rounded-3xl sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Transcript
              </p>
              {isEditingAnswer || !speech.supported ? (
                <Textarea
                  value={speech.transcript}
                  onChange={(e) => speech.setTranscript(e.target.value)}
                  placeholder="Type your Korean answer if voice capture was weak…"
                  className="mt-3 min-h-[110px] rounded-2xl border-border bg-accent/5 transition-colors focus:bg-background"
                />
              ) : speech.transcript ? (
                <p
                  lang="ko"
                  className="mt-3 break-keep text-lg font-bold leading-relaxed text-foreground"
                >
                  {speech.transcript}
                </p>
              ) : (
                <p className="mt-3 py-6 text-center text-sm font-medium italic text-muted-foreground">
                  {recording
                    ? "Listening… speak your answer in Korean."
                    : "Your spoken answer will appear here."}
                </p>
              )}
            </div>

            {speech.error && <ErrorBanner message={speech.error} />}

            <Button
              onClick={submitAnswer}
              disabled={!speech.transcript.trim() || isExaminerThinking}
              className="h-12 w-full rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-lg transition-all active:scale-95 disabled:opacity-40 sm:h-14"
            >
              <Send size={18} className="mr-2" /> Submit Answer & Next Question
            </Button>

            {/* Wrap up the session and get a scorecard. Practice allows an early
                finish; exam mode wants a real conversation first. */}
            {answeredCount >= cfg.minAnswersBeforeFinish && (
              <Button
                variant="outline"
                onClick={finishInterview}
                disabled={isEvaluating || isExaminerThinking}
                className="h-12 w-full rounded-2xl border-blue-500/40 bg-blue-500/5 px-6 text-sm font-bold text-blue-600 transition-all hover:bg-blue-500/10 active:scale-95 disabled:opacity-50 dark:text-blue-400 sm:h-14"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" /> Scoring your interview…
                  </>
                ) : (
                  <>
                    <Award size={18} className="mr-2" /> Finish & Get Evaluation
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick references during the session — practice mode only. Exam mode is
          closed-book, like the real interview. */}
      {cfg.showStudyPackInSession && (
        <>
          <motion.div variants={itemVariants}>
            <SpeakingTipsCard />
          </motion.div>
          {topic.prep && (
            <motion.div variants={itemVariants}>
              <StudyPack topic={topic} />
            </motion.div>
          )}
        </>
      )}

      {/* Session history */}
      {entries.length > 1 && (
        <motion.div variants={itemVariants}>
          <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
            <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
              <CardTitle className="text-base font-bold">Session Transcript</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {entries.map((entry) =>
                entry.kind === "examiner" ? (
                  <div key={entry.id} className="rounded-2xl border border-border bg-accent/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
                      Examiner
                    </p>
                    <p lang="ko" className="mt-1.5 font-bold text-foreground">
                      {entry.turn.questionKo}
                    </p>
                    {cfg.showEnglish && entry.turn.questionEn && (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        {entry.turn.questionEn}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      You
                    </p>
                    <p lang="ko" className="mt-1.5 font-medium text-foreground">
                      {entry.text}
                    </p>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
      <p className="text-sm font-bold leading-relaxed text-destructive">{message}</p>
    </motion.div>
  )
}
