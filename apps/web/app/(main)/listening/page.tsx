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

import { PageHero } from "@/components/app/page-hero"
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
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

  async function handlePlay(targetRate: number) {
    const audio = await ensureAudio()
    if (!audio) return
    audio.playbackRate = targetRate
    setRate(targetRate)
    audio.play()
    setPlaying(true)
  }

  function handlePauseToggle() {
    const audio = audioRef.current
    if (!audio) {
      handlePlay(rate)
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
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
      className="space-y-8 pb-12"
    >
      <motion.div variants={itemVariants}>
        <PageHero
          eyebrow="Listening"
          title="Listening Practice"
          description="Generate realistic Korean workplace conversations, listen at normal or slow speed, reveal the transcript, then test your comprehension with a quiz."
          stats={[
            { label: "Audio", value: "Normal + Slow" },
            { label: "Format", value: "Convo + Quiz" },
            { label: "Topics", value: `${topics.length}` },
          ]}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40"
      >
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Topic
        </label>
        <ChipSelect options={topics} value={topic} onChange={setTopic} className="mt-3" />
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-500 active:scale-95"
          >
            <Sparkles size={16} className="mr-2" strokeWidth={2.5} />
            {loading ? "Generating..." : lesson ? "New Lesson" : "Generate Lesson"}
          </Button>
        </div>
      </motion.div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading && (
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-border bg-card p-7 dark:bg-slate-900/40"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
        </motion.div>
      )}

      {lesson && !loading && (
        <>
          {/* Player */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Headphones size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600/70 dark:text-emerald-400/70">
                    {lesson.topic}
                  </p>
                  <h3 className="text-base font-bold text-foreground">{lesson.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handlePauseToggle}
                  disabled={audioLoading}
                  className="h-10 w-10 rounded-full bg-emerald-600 p-0 text-white hover:bg-emerald-500 active:scale-95"
                  title={playing ? "Pause" : "Play"}
                >
                  {audioLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : playing ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                </Button>
                {PLAYBACK_RATES.map(({ label, rate: r, icon: Icon }) => (
                  <Button
                    key={label}
                    type="button"
                    onClick={() => handlePlay(r)}
                    className={cn(
                      "h-10 rounded-xl px-4 text-xs font-bold active:scale-95",
                      rate === r
                        ? "bg-foreground text-background"
                        : "border border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    {Icon && <Icon size={14} className="mr-1.5" />} {label}
                  </Button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              {showTranscript ? <EyeOff size={14} /> : <Eye size={14} />}
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>

            {showTranscript && (
              <div className="mt-4 space-y-3">
                {lesson.lines.map((line, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-background/60 px-4 py-3 dark:bg-white/4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                      {line.speaker}
                    </p>
                    <p className="mt-1 font-bold text-foreground">{line.korean}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{line.english}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quiz */}
          {lesson.quiz.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Comprehension quiz
              </p>
              {lesson.quiz.map((q, qi) => {
                const chosen = answers[qi]
                const revealed = result !== null
                return (
                  <div
                    key={qi}
                    className="rounded-2xl border border-border bg-card p-5 dark:bg-slate-900/40"
                  >
                    <p className="font-bold text-foreground">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, oi) => {
                        const isChosen = chosen === oi
                        const isCorrect = revealed && oi === q.answerIndex
                        const isWrongChoice = revealed && isChosen && oi !== q.answerIndex
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={revealed}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                              isCorrect &&
                                "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                              isWrongChoice &&
                                "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300",
                              !revealed &&
                                isChosen &&
                                "border-emerald-500/50 bg-emerald-500/5 text-foreground",
                              !revealed &&
                                !isChosen &&
                                "border-border bg-background text-foreground hover:bg-accent",
                              revealed &&
                                !isCorrect &&
                                !isWrongChoice &&
                                "border-border bg-background text-muted-foreground",
                            )}
                          >
                            <span>{opt}</span>
                            {isCorrect && <CheckCircle2 size={16} className="shrink-0" />}
                            {isWrongChoice && <XCircle size={16} className="shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    {revealed && q.explanation && (
                      <p className="mt-3 rounded-xl bg-sky-50/60 px-4 py-2.5 text-sm leading-6 text-sky-800 dark:bg-sky-400/6 dark:text-sky-200">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )
              })}

              {!result ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? "Scoring..." : "Submit answers"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {result.score} / {result.total} correct · {result.accuracy}%
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        Saved to your progress.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setAnswers({})
                      setResult(null)
                    }}
                    className="h-10 rounded-xl border border-border bg-background px-5 text-xs font-bold text-foreground hover:bg-accent active:scale-95"
                  >
                    <RotateCcw size={14} className="mr-2" /> Try again
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {!lesson && !loading && !error && (
        <motion.div
          variants={itemVariants}
          className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center"
        >
          <Headphones size={32} className="mx-auto text-muted-foreground/50" strokeWidth={2} />
          <p className="mt-3 text-sm font-bold text-foreground">No lesson yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a topic above and generate your first listening lesson.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
