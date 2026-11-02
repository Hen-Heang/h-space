"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Award, Languages, Loader2, RotateCcw, Send, Sparkles } from "lucide-react"
import { motion } from "motion/react"

import { AnswerInput } from "@/components/interview/AnswerInput"
import { EvaluationSummary } from "@/components/interview/EvaluationSummary"
import { ExamPrepHome } from "@/components/interview/ExamPrepHome"
import { ExamTimer } from "@/components/interview/ExamTimer"
import { SpeakingTipsCard } from "@/components/interview/SpeakingTipsCard"
import { StickyActionBar } from "@/components/interview/StickyActionBar"
import { StudyPack } from "@/components/interview/StudyPack"
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
import { Button } from "@/components/ui/button"
import { useAnswerMode } from "@/hooks/useAnswerMode"
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

type SessionEntry =
  | { id: string; kind: "examiner"; turn: ExaminerTurn }
  | { id: string; kind: "answer"; text: string }

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
  const answerMode = useAnswerMode(speech)
  // Read by the async speak-then-listen chain, which resolves renders later.
  const canAutoListenRef = useRef(answerMode.canAutoListen)
  useEffect(() => {
    canAutoListenRef.current = answerMode.canAutoListen
  }, [answerMode.canAutoListen])
  const conversationRef = useRef<string | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  // Guards the hands-free auto-listen: question audio can still be playing
  // when the candidate ends the session, and the mic must not open then.
  const sessionActiveRef = useRef(false)

  const topic = INTERVIEW_TOPICS[0]
  const cfg = INTERVIEW_MODES[mode]

  // Merge remote attempt history into the local trend. The local copy always
  // renders; a failed sync is shown (with Retry) instead of being swallowed, so
  // a short trend isn't mistaken for "no other attempts".
  const [historySync, setHistorySync] = useState<"loading" | "ok" | "failed">("loading")
  const historyActiveRef = useRef(true)
  const syncHistory = useCallback(() => {
    interviewApi
      .listAttempts()
      .then((attempts) => {
        if (!historyActiveRef.current) return
        if (attempts.length > 0) {
          setHistory(mergeScorecards(loadScorecards(), attempts.map(toScorecardRecord)))
        }
        setHistorySync("ok")
      })
      .catch(() => {
        if (historyActiveRef.current) setHistorySync("failed")
      })
  }, [])
  useEffect(() => {
    historyActiveRef.current = true
    syncHistory()
    return () => {
      historyActiveRef.current = false
    }
  }, [syncHistory])

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
        if (played && sessionActiveRef.current && canAutoListenRef.current) speech.start()
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

  // ── Exam Prep home ───────────────────────────────────────────────
  if (phase === "select") {
    return (
      <ExamPrepHome
        topic={topic}
        mode={mode}
        onModeChange={setMode}
        onStartMock={startSession}
        startingMock={isExaminerThinking}
        mockError={error}
        history={history}
        historySyncFailed={historySync === "failed"}
        onRetryHistory={() => {
          setHistorySync("loading")
          syncHistory()
        }}
      />
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
        topic={topic}
      />
    )
  }

  // ── Live session ─────────────────────────────────────────────────
  const answeredCount = entries.filter((entry) => entry.kind === "answer").length
  const answer = speech.transcript.trim()

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-40 sm:pb-28">
      {/* Compact session bar — active practice, not a page hero. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Mock interview</span> · {cfg.label} ·
            question {Math.max(questionCount, 1)}
          </p>
          <div className="flex items-center gap-2">
            {endsAt !== null && <ExamTimer endsAt={endsAt} onExpire={finishInterview} />}
            <Button variant="outline" size="sm" onClick={requestEndSession} className="h-10">
              <RotateCcw aria-hidden="true" /> End session
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {cfg.showEnglish
            ? "Listen to each question, then answer out loud in Korean. Show the English only if you need it."
            : "Exam conditions: Korean only, no feedback until the end. Listen, think, answer."}
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
      </div>

      {/* Current question */}
      <section aria-label="Examiner's question" className="app-surface space-y-4 p-5 sm:p-6">
        {/* Feedback on the previous answer (practice mode only) */}
        {cfg.showFeedback && current?.feedback && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-foreground/90">{current.feedback}</p>
          </div>
        )}

        <div aria-live="polite" aria-busy={isExaminerThinking}>
          {isExaminerThinking && !streamingText ? (
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> The examiner is
              thinking…
            </p>
          ) : (
            <p
              lang="ko"
              className="break-keep text-[1.4rem] font-semibold leading-snug text-foreground sm:text-2xl"
            >
              {streamingText ? parseExaminerTurn(streamingText).questionKo : current?.questionKo}
            </p>
          )}
        </div>

        {current && !streamingText && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
              <SpeakButton text={current.questionKo} className="p-0" /> Normal
            </span>
            {cfg.allowSlowReplay && (
              <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
                <SpeakButton text={current.questionKo} className="p-0" playbackRate={0.75} /> Slow
              </span>
            )}
            {cfg.showEnglish && current.questionEn && (
              <Button
                variant="ghost"
                onClick={() => setShowEnglish((v) => !v)}
                aria-expanded={showEnglish}
                className="h-11"
              >
                <Languages aria-hidden="true" /> {showEnglish ? "Hide English" : "Show English"}
              </Button>
            )}
          </div>
        )}
        {cfg.showEnglish && showEnglish && current?.questionEn && !streamingText && (
          <p className="text-sm leading-relaxed text-muted-foreground">{current.questionEn}</p>
        )}
      </section>

      {error && <ErrorBanner message={error} />}

      <section aria-label="Answer" className="app-surface p-4 sm:p-6">
        <AnswerInput
          speech={speech}
          mode={answerMode}
          disabled={isExaminerThinking || isEvaluating}
          placeholder="Type your Korean answer…"
        />
      </section>

      {/* Quick references during the session — practice mode only. Exam mode is
          closed-book, like the real interview. */}
      {cfg.showStudyPackInSession && (
        <>
          <SpeakingTipsCard />
          {topic.prep && <StudyPack topic={topic} />}
        </>
      )}

      {/* Session transcript, Korean only (English stays on demand above). */}
      {entries.length > 1 && (
        <section aria-labelledby="mock-transcript" className="app-surface p-5 sm:p-6">
          <h3 id="mock-transcript" className="text-sm font-semibold text-foreground">
            Session transcript
          </h3>
          <ol className="mt-3 space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.kind === "examiner"
                    ? "rounded-xl border border-border bg-muted/20 p-3"
                    : "rounded-xl border border-primary/20 bg-primary/5 p-3"
                }
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {entry.kind === "examiner" ? "Examiner" : "You"}
                </p>
                <p lang="ko" className="mt-1 break-keep text-foreground">
                  {entry.kind === "examiner" ? entry.turn.questionKo : entry.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Main actions stay within thumb reach while reading the question above. */}
      <StickyActionBar label="Answer actions" pinned={answer.length > 0}>
        <Button
          size="lg"
          onClick={submitAnswer}
          disabled={!answer || isExaminerThinking || isEvaluating}
          className="h-11 w-full sm:h-12 sm:w-auto sm:flex-1"
        >
          <Send aria-hidden="true" /> Submit answer
        </Button>
        {/* Practice allows an early finish; exam mode wants a real conversation first. */}
        {answeredCount >= cfg.minAnswersBeforeFinish && (
          <Button
            size="lg"
            variant="outline"
            onClick={finishInterview}
            disabled={isEvaluating || isExaminerThinking}
            className="h-11 w-full sm:h-12 sm:w-auto sm:flex-1"
          >
            {isEvaluating ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" /> Scoring your interview…
              </>
            ) : (
              <>
                <Award aria-hidden="true" /> Finish & get evaluation
              </>
            )}
          </Button>
        )}
      </StickyActionBar>
    </div>
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
