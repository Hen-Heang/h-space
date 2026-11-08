"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react"
import { motion } from "motion/react"

import { LearnHeader } from "@/components/learn/LearnHeader"
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
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
import { ChipSelect } from "@/components/ui/chip-select"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useChoices } from "@/hooks/useChoices"
import { listeningApi, ttsApi, getApiErrorMessage } from "@/lib/api"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { ListeningAttemptResult, ListeningLesson } from "@/lib/types"

const FALLBACK_TOPICS = [
  "Daily Standup",
  "Code Review",
  "Team Meeting",
  "Bug Discussion",
  "Deployment",
]

const PLAYBACK_RATES = [
  { label: "Normal", rate: 1, icon: null },
  { label: "Slow", rate: 0.65, icon: Gauge },
]

const PLAYBACK_ERROR = "Couldn't play the audio. Check your sound settings and try again."

export default function ListeningPage() {
  return (
    <div className="space-y-6">
      <WorkspaceTabs sectionId="learn" />
      <Suspense fallback={null}>
        <ListeningPageContent />
      </Suspense>
    </div>
  )
}

function ListeningPageContent() {
  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic") ?? undefined
  const {
    options: topics,
    selected: topic,
    setSelected: setTopic,
  } = useChoices(listeningApi.getTopics, FALLBACK_TOPICS, initialTopic)
  const [lesson, setLesson] = useState<ListeningLesson | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [showTranscript, setShowTranscript] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<ListeningAttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmNewLesson, setConfirmNewLesson] = useState(false)
  const resultRef = useRef<HTMLDivElement | null>(null)
  const { logActivity } = useLogActivity("listening")
  useSessionTimer("listening")

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const audioPromiseRef = useRef<Promise<HTMLAudioElement | null> | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  // The Submit button disappears once the result shows, so hand focus to the
  // result card instead of letting it fall back to <body>. Focusing the card
  // is also what reads the score out to screen readers.
  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  function resetLessonState() {
    audioRef.current?.pause()
    audioRef.current = null
    audioPromiseRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    setPlaying(false)
    setShowTranscript(false)
    setAnswers({})
    setResult(null)
  }

  const answeredCount = Object.keys(answers).length
  // Picked-but-unsubmitted answers are the only work a new lesson throws away;
  // a scored attempt is already saved.
  const hasUnsubmittedAnswers = lesson !== null && result === null && answeredCount > 0

  function requestGenerate() {
    if (hasUnsubmittedAnswers) {
      setConfirmNewLesson(true)
      return
    }
    void handleGenerate()
  }

  async function handleGenerate() {
    setLoading(true)
    setError("")
    resetLessonState()
    try {
      const data = await listeningApi.generate(topic)
      setLesson(data)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate a listening lesson. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  function ensureAudio(): Promise<HTMLAudioElement | null> {
    if (audioRef.current) return Promise.resolve(audioRef.current)
    // Reuse the in-flight load so rapid Play/Slow clicks don't fire duplicate TTS requests
    if (audioPromiseRef.current) return audioPromiseRef.current
    if (!lesson) return Promise.resolve(null)
    setAudioLoading(true)
    audioPromiseRef.current = (async () => {
      try {
        const script = lesson.lines.map((l) => l.korean).join(" ")
        const url = await ttsApi.speak(script)
        const audio = new Audio(url)
        audio.onended = () => setPlaying(false)
        audioRef.current = audio
        audioUrlRef.current = url
        return audio
      } catch (err) {
        setError(getApiErrorMessage(err, "Could not load audio."))
        return null
      } finally {
        audioPromiseRef.current = null
        setAudioLoading(false)
      }
    })()
    return audioPromiseRef.current
  }

  // play() rejects when the browser blocks playback or can't decode the file.
  // Say so instead of leaving the button showing "Pause" over silence.
  async function startPlayback(audio: HTMLAudioElement) {
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
      setError(PLAYBACK_ERROR)
    }
  }

  async function handlePlay(targetRate: number) {
    const audio = await ensureAudio()
    if (!audio) return
    audio.playbackRate = targetRate
    setRate(targetRate)
    await startPlayback(audio)
  }

  function handlePauseToggle() {
    const audio = audioRef.current
    if (!audio) {
      void handlePlay(rate)
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void startPlayback(audio)
    }
  }

  async function handleSubmit() {
    if (!lesson) return
    setSubmitting(true)
    try {
      const ordered = lesson.quiz.map((_, i) => answers[i] ?? -1)
      const res = await listeningApi.submitAttempt(lesson.id, ordered)
      setResult(res)
      void logActivity()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit your answers."))
    } finally {
      setSubmitting(false)
    }
  }

  const allAnswered = lesson ? lesson.quiz.every((_, i) => answers[i] !== undefined) : false

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <LearnHeader description="Listen to a short Korean workplace conversation at normal or slow speed, then answer a few questions about it." />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <p
          id="listening-topic-label"
          className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Topic
        </p>
        <div role="group" aria-labelledby="listening-topic-label">
          <ChipSelect options={topics} value={topic} onChange={setTopic} className="mt-3" />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            size="lg"
            variant={lesson ? "outline" : "default"}
            onClick={requestGenerate}
            disabled={loading}
            className="rounded-xl"
          >
            <Sparkles aria-hidden />
            {loading ? "Generating..." : lesson ? "New lesson" : "Generate lesson"}
          </Button>
        </div>
      </motion.div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading && (
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-border bg-card p-6"
          aria-busy="true"
          aria-label="Generating lesson"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
        </motion.div>
      )}

      {lesson && !loading && (
        <>
          {/* Player */}
          <motion.section
            variants={itemVariants}
            aria-labelledby="listening-lesson-title"
            className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Headphones size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {lesson.topic}
                  </p>
                  <h2
                    id="listening-lesson-title"
                    className="text-base font-bold break-words text-foreground"
                  >
                    {lesson.title}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  onClick={handlePauseToggle}
                  disabled={audioLoading}
                  aria-label={audioLoading ? "Loading audio" : playing ? "Pause" : "Play"}
                  className="rounded-full"
                >
                  {audioLoading ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : playing ? (
                    <Pause aria-hidden />
                  ) : (
                    <Play aria-hidden />
                  )}
                </Button>
                {PLAYBACK_RATES.map(({ label, rate: r, icon: Icon }) => (
                  <Button
                    key={label}
                    type="button"
                    variant={rate === r ? "secondary" : "outline"}
                    aria-pressed={rate === r}
                    onClick={() => void handlePlay(r)}
                    disabled={audioLoading}
                    className="rounded-xl"
                  >
                    {Icon && <Icon aria-hidden />}
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript((v) => !v)}
              aria-expanded={showTranscript}
              aria-controls="listening-transcript"
              className="mt-4 -ml-3 text-primary hover:text-primary"
            >
              {showTranscript ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </Button>

            {showTranscript && (
              <ol id="listening-transcript" className="mt-2 divide-y divide-border">
                {lesson.lines.map((line, i) => (
                  <li key={i} className="py-3 first:pt-1 last:pb-0">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      {line.speaker}
                    </p>
                    <p
                      lang="ko"
                      className="mt-1 text-lg leading-relaxed font-semibold break-keep text-foreground"
                    >
                      {line.korean}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{line.english}</p>
                  </li>
                ))}
              </ol>
            )}
          </motion.section>

          {/* Quiz */}
          {lesson.quiz.length > 0 && (
            <motion.section
              variants={itemVariants}
              aria-labelledby="listening-quiz-heading"
              className="space-y-4"
            >
              <h2
                id="listening-quiz-heading"
                className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Comprehension quiz
              </h2>
              {lesson.quiz.map((q, qi) => {
                const chosen = answers[qi]
                const revealed = result !== null
                return (
                  <div key={qi} className="rounded-2xl border border-border bg-card p-5">
                    {/* A native radio group: arrow keys move between options and
                        screen readers announce which one is selected. */}
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend className="p-0 font-bold text-foreground">
                        {qi + 1}. {q.question}
                      </legend>
                      <div className="mt-3 space-y-2">
                        {q.options.map((opt, oi) => {
                          const isChosen = chosen === oi
                          const isCorrect = revealed && oi === q.answerIndex
                          const isWrongChoice = revealed && isChosen && oi !== q.answerIndex
                          return (
                            <label
                              key={oi}
                              className={cn(
                                "flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60",
                                !revealed && "cursor-pointer",
                                isCorrect &&
                                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                                isWrongChoice &&
                                  "border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-200",
                                !revealed &&
                                  isChosen &&
                                  "border-primary bg-primary/5 text-foreground",
                                !revealed &&
                                  !isChosen &&
                                  "border-border bg-background text-foreground hover:bg-accent",
                                revealed &&
                                  !isCorrect &&
                                  !isWrongChoice &&
                                  "border-border bg-background text-muted-foreground",
                              )}
                            >
                              <input
                                type="radio"
                                name={`listening-q-${qi}`}
                                value={oi}
                                checked={isChosen}
                                disabled={revealed}
                                onChange={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                                className="size-4 shrink-0 accent-primary"
                              />
                              <span className="min-w-0 flex-1 break-words">{opt}</span>
                              {isCorrect && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                                  <CheckCircle2 size={16} aria-hidden />
                                  Correct answer
                                </span>
                              )}
                              {isWrongChoice && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                                  <XCircle size={16} aria-hidden />
                                  Your answer
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                    {revealed && q.explanation && (
                      <p className="mt-3 rounded-xl bg-muted/60 px-4 py-2.5 text-sm leading-6 text-foreground">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )
              })}

              {!result ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <p className="text-sm text-muted-foreground">
                    {answeredCount} of {lesson.quiz.length} answered
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="rounded-xl"
                  >
                    {submitting ? "Scoring..." : "Submit answers"}
                  </Button>
                </div>
              ) : (
                <div
                  ref={resultRef}
                  tabIndex={-1}
                  aria-labelledby="listening-result-score"
                  aria-describedby="listening-result-saved"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card px-5 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 size={20} aria-hidden />
                    </div>
                    <div>
                      <p id="listening-result-score" className="text-sm font-bold text-foreground">
                        {result.score} of {result.total} correct · {result.accuracy}%
                      </p>
                      <p id="listening-result-saved" className="text-sm text-muted-foreground">
                        Saved to your progress.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAnswers({})
                      setResult(null)
                    }}
                    className="rounded-xl"
                  >
                    <RotateCcw aria-hidden /> Try again
                  </Button>
                </div>
              )}
            </motion.section>
          )}
        </>
      )}

      {!lesson && !loading && !error && (
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center"
        >
          <Headphones size={32} className="mx-auto text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-bold text-foreground">No lesson yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a topic above and generate your first listening lesson.
          </p>
        </motion.div>
      )}

      <AlertDialog open={confirmNewLesson} onOpenChange={setConfirmNewLesson}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers to this lesson haven&apos;t been submitted and will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this lesson</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleGenerate()}>New lesson</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
