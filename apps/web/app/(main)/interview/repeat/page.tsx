"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  FileText,
  Loader2,
  Mic,
  Quote,
  Repeat2,
  RotateCcw,
  Square,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHero } from "@/components/app/page-hero"
import { SpeakButton, getCachedAudioUrl } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { interviewApi } from "@/lib/api"
import { INTERVIEW_TOPICS } from "@/lib/interview"
import {
  compareRepeat,
  phrasesToRepeatSentences,
  scriptToRepeatSentences,
  type RepeatComparison,
  type RepeatSentence,
} from "@/lib/repeat-drill"
import { registerSpeechAudio, stopSpeechAudio } from "@/lib/speech-audio"
import { cn } from "@/lib/utils"

const LAST_SESSION_KEY = "kori.drill.repeat.last"

// How long after your last recognized words the attempt auto-grades. The
// browser's own single-utterance capture cuts off at the first ~1s pause —
// too short for multi-clause script sentences — so the mic runs in continuous
// mode and this timer decides when the sentence is finished.
const SILENCE_STOP_MS = 2500
// Safety cap: never leave the mic open longer than this per attempt.
const MAX_LISTEN_MS = 30000

type RepeatSource = "script" | "phrases"

interface SentenceProgress {
  tries: number
  best: RepeatComparison
}

interface LastSession {
  finishedAt: string
  source: RepeatSource
  total: number
  perfect: number
  avgSimilarity: number
}

function loadLastSession(): LastSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LAST_SESSION_KEY)
    return raw ? (JSON.parse(raw) as LastSession) : null
  } catch {
    return null
  }
}

// Plays the sentence through the shared TTS cache; resolves true only after
// playback finished so the mic never opens over the model voice.
async function autoSpeak(text: string): Promise<boolean> {
  if (!text) return false
  let stopAudio: (() => void) | undefined
  try {
    const url = await getCachedAudioUrl(text)
    const audio = new Audio(url)
    const done = new Promise<boolean>((resolve) => {
      stopAudio = registerSpeechAudio(audio, () => resolve(audio.ended))
    })
    await audio.play()
    return await done
  } catch {
    // Blocked autoplay or TTS down — manual playback still works.
    stopAudio?.()
    return false
  }
}

const GRADE_STYLES = {
  perfect: {
    banner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    label: "Perfect! 완벽해요",
  },
  good: {
    banner: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    label: "Close — check the missed words",
  },
  retry: {
    banner: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    label: "Listen once more and try again",
  },
} as const

export default function RepeatDrillPage() {
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")

  const [phase, setPhase] = useState<"setup" | "loading" | "drill" | "summary">("setup")
  const [source, setSource] = useState<RepeatSource>("script")
  const [items, setItems] = useState<RepeatSentence[]>([])
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<RepeatComparison | null>(null)
  const [spoken, setSpoken] = useState("")
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({})
  // Lazy init reads localStorage on the first client render — same pattern as
  // the mock interview page's scorecard history.
  const [lastSession, setLastSession] = useState<LastSession | null>(loadLastSession)
  useScrollToTopOnChange(phase)

  // The graded sentence comes from refs: onResult fires from the recognition
  // engine, whose callback closure may be a render behind.
  const itemsRef = useRef<RepeatSentence[]>([])
  const indexRef = useRef(0)
  const drillActiveRef = useRef(false)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  // Continuous capture + own silence timer: the mic stays open through
  // mid-sentence pauses and waiting-to-start nerves, then auto-grades
  // SILENCE_STOP_MS after your last recognized words — still hands-free,
  // without the browser's too-eager single-utterance cutoff.
  const speech = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    onResult: (transcript) => {
      const sentence = itemsRef.current[indexRef.current]
      const said = transcript.trim()
      if (!sentence || !said || !drillActiveRef.current) return
      const comparison = compareRepeat(sentence.ko, said)
      setSpoken(said)
      setResult(comparison)
      setProgress((prev) => {
        const existing = prev[sentence.id]
        const best =
          existing && existing.best.similarity >= comparison.similarity ? existing.best : comparison
        return { ...prev, [sentence.id]: { tries: (existing?.tries ?? 0) + 1, best } }
      })
      void logActivity()
    },
  })

  useEffect(() => {
    return () => {
      drillActiveRef.current = false
      stopSpeechAudio()
    }
  }, [])

  const topic = INTERVIEW_TOPICS[0]
  const sentence = items[index]
  const listening = speech.status === "listening"

  // Timers act through a ref so re-renders don't tie them to a stale stop().
  const speechRef = useRef(speech)
  useEffect(() => {
    speechRef.current = speech
  })

  // Auto-grade: once something has been recognized, each new word resets this
  // timer; SILENCE_STOP_MS of quiet means the sentence is done.
  const hasTranscript = Boolean(speech.transcript.trim())
  useEffect(() => {
    if (!listening || !hasTranscript) return
    const timer = setTimeout(() => speechRef.current.stop(), SILENCE_STOP_MS)
    return () => clearTimeout(timer)
  }, [listening, hasTranscript, speech.transcript])

  // Hard cap per attempt so a forgotten tab doesn't hold the mic forever.
  useEffect(() => {
    if (!listening) return
    const cap = setTimeout(() => speechRef.current.stop(), MAX_LISTEN_MS)
    return () => clearTimeout(cap)
  }, [listening])

  function playThenListen(text: string) {
    void autoSpeak(text).then((played) => {
      if (played && drillActiveRef.current) speech.start()
    })
  }

  async function startDrill() {
    setPhase("loading")
    setResult(null)
    setSpoken("")
    setProgress({})
    setIndex(0)
    speech.reset()

    let queue: RepeatSentence[] = []
    if (source === "script") {
      // Saved script first; sections the candidate never saved fall back to
      // the seed draft, matching the script editor's behavior.
      let sections: Record<string, string> | null = null
      try {
        sections = (await interviewApi.getScript(topic.id))?.sections ?? null
      } catch {
        // Offline / logged out — the seed script still makes a full drill.
      }
      queue = scriptToRepeatSentences(topic, sections)
    } else {
      queue = phrasesToRepeatSentences(topic.prep?.keyPhrases ?? [])
    }

    if (queue.length === 0) {
      setPhase("setup")
      return
    }

    setItems(queue)
    itemsRef.current = queue
    drillActiveRef.current = true
    setPhase("drill")
    playThenListen(queue[0].ko)
  }

  function retrySentence() {
    if (!sentence) return
    setResult(null)
    setSpoken("")
    speech.reset()
    playThenListen(sentence.ko)
  }

  function nextSentence() {
    setResult(null)
    setSpoken("")
    speech.reset()
    if (index + 1 >= items.length) {
      finishDrill()
      return
    }
    const nextIdx = index + 1
    setIndex(nextIdx)
    playThenListen(items[nextIdx].ko)
  }

  function finishDrill() {
    drillActiveRef.current = false
    stopSpeechAudio()
    speech.reset()
    const attempted = Object.values(progress)
    const summary: LastSession = {
      finishedAt: new Date().toISOString(),
      source,
      total: attempted.length,
      perfect: attempted.filter((p) => p.best.grade === "perfect").length,
      avgSimilarity:
        attempted.length === 0
          ? 0
          : Math.round(attempted.reduce((sum, p) => sum + p.best.similarity, 0) / attempted.length),
    }
    try {
      window.localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(summary))
    } catch {
      // ignore
    }
    setLastSession(summary)
    setPhase("summary")
  }

  // ── Setup ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-6 pb-12 sm:space-y-8">
        <PageHero
          headingLevel="h2"
          eyebrow="Exam Prep · 따라 말하기"
          title="Repeat Drill"
          description="Duolingo-style listen &amp; repeat: hear a sentence, say it back, and see exactly which words you hit or missed. The fastest way to memorize your script out loud."
          stats={[
            { label: "Format", value: "Listen & repeat" },
            { label: "Graded", value: "Word by word" },
            {
              label: "Last session",
              value: lastSession ? `${lastSession.perfect}/${lastSession.total} perfect` : "—",
            },
          ]}
          actions={
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-border bg-background px-4 font-bold hover:bg-accent"
            >
              <Link href="/interview">
                <ArrowLeft size={16} className="mr-2" /> Mock Interview
              </Link>
            </Button>
          }
        />

        {/* Source picker */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setSource("script")}
            className={cn(
              "rounded-[1.5rem] border p-5 text-left transition-all active:scale-[0.99] sm:rounded-3xl",
              source === "script"
                ? "border-emerald-500/60 bg-emerald-500/5 shadow-md"
                : "border-border bg-card shadow-sm hover:shadow-md dark:bg-slate-900/40",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <p className="mt-3 text-lg font-bold text-foreground">My Script</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              Your 7-section exam script, sentence by sentence in memorization order.
            </p>
          </button>
          <button
            onClick={() => setSource("phrases")}
            className={cn(
              "rounded-[1.5rem] border p-5 text-left transition-all active:scale-[0.99] sm:rounded-3xl",
              source === "phrases"
                ? "border-emerald-500/60 bg-emerald-500/5 shadow-md"
                : "border-border bg-card shadow-sm hover:shadow-md dark:bg-slate-900/40",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Quote size={20} strokeWidth={2.5} />
            </div>
            <p className="mt-3 text-lg font-bold text-foreground">Key Phrases</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              The study pack&apos;s essential phrases and safety sentences.
            </p>
          </button>
        </div>

        {!speech.supported && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              This drill needs the browser&apos;s speech recognition — open it in Chrome (or Safari)
              to speak your repeats.
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={startDrill}
            disabled={!speech.supported}
            className="h-14 w-full rounded-2xl bg-emerald-600 px-10 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 sm:w-auto"
          >
            <Repeat2 size={20} className="mr-2" /> Start Repeat Drill
          </Button>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-muted-foreground">Preparing your sentences…</p>
      </div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────
  if (phase === "summary") {
    const attempted = items.filter((s) => progress[s.id])
    const perfect = attempted.filter((s) => progress[s.id].best.grade === "perfect")
    const weak = attempted.filter((s) => progress[s.id].best.grade !== "perfect")
    return (
      <div className="space-y-5 pb-12 sm:space-y-6">
        <PageHero
          headingLevel="h2"
          eyebrow="Repeat Drill · Result"
          title="Drill Complete"
          description={
            attempted.length === 0
              ? "No sentences answered this time — start again and say at least one out loud."
              : weak.length === 0
                ? "Every sentence perfect — that script is getting into your voice, not just your eyes."
                : "Replay the sentences below and repeat each one once more — the missed words are marked."
          }
          stats={[
            { label: "Sentences", value: String(attempted.length) },
            { label: "Perfect", value: String(perfect.length) },
            {
              label: "Avg match",
              value: lastSession ? `${lastSession.avgSimilarity}%` : "—",
            },
          ]}
        />

        {weak.map((s) => {
          const best = progress[s.id].best
          return (
            <Card
              key={s.id}
              className="rounded-[1.8rem] border-border bg-card shadow-sm dark:bg-slate-900/40 sm:rounded-[2.2rem]"
            >
              <CardContent className="space-y-2 p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {s.sourceLabel} · best match {best.similarity}%
                </p>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-bold leading-relaxed">
                    {best.marks.map((mark, i) => (
                      <span
                        key={i}
                        className={cn(
                          mark.hit
                            ? "text-foreground"
                            : "text-rose-600 underline decoration-rose-400 decoration-2 underline-offset-4 dark:text-rose-400",
                        )}
                      >
                        {mark.word}{" "}
                      </span>
                    ))}
                  </p>
                  <SpeakButton text={s.ko} className="mt-0.5 shrink-0 p-1.5" />
                </div>
              </CardContent>
            </Card>
          )
        })}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={startDrill}
            className="h-14 w-full rounded-2xl bg-emerald-600 px-10 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 sm:w-auto"
          >
            <RotateCcw size={20} className="mr-2" /> Drill Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-14 w-full rounded-2xl border-border bg-background px-8 text-base font-bold hover:bg-accent active:scale-95 sm:w-auto"
          >
            <Link href="/interview">
              <ArrowLeft size={20} className="mr-2" /> Back to Mock Interview
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Drill ────────────────────────────────────────────────────────
  const grade = result ? GRADE_STYLES[result.grade] : null

  return (
    <div className="space-y-5 pb-12 sm:space-y-6">
      <PageHero
        headingLevel="h2"
        eyebrow="Repeat Drill · In Progress"
        title={`Sentence ${index + 1} of ${items.length}`}
        description="Listen, then say the sentence back exactly. Missed words show in red — repeat until it feels automatic."
        stats={[
          { label: "Sentence", value: `${index + 1}/${items.length}` },
          { label: "Tries here", value: String(progress[sentence?.id ?? ""]?.tries ?? 0) },
          {
            label: "Perfect",
            value: String(Object.values(progress).filter((p) => p.best.grade === "perfect").length),
          },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={finishDrill}
            className="h-10 rounded-xl border-border bg-background px-4 font-bold hover:bg-accent"
          >
            End drill
          </Button>
        }
      />

      {/* Target sentence */}
      <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
            {sentence?.sourceLabel}
          </p>
          <p className="text-[1.4rem] font-bold leading-snug text-foreground sm:text-2xl">
            {result
              ? result.marks.map((mark, i) => (
                  <span
                    key={i}
                    className={cn(
                      mark.hit
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 underline decoration-rose-400 decoration-2 underline-offset-4 dark:text-rose-400",
                    )}
                  >
                    {mark.word}{" "}
                  </span>
                ))
              : sentence?.ko}
          </p>
          {sentence?.en && (
            <p className="text-sm font-medium italic text-muted-foreground">{sentence.en}</p>
          )}
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-background p-1.5 shadow-sm w-fit">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-accent">
              <SpeakButton text={sentence?.ko ?? ""} className="p-0" />
              <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                Normal
              </span>
            </div>
            <div className="mx-1 h-4 w-px bg-border" />
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-accent">
              <SpeakButton text={sentence?.ko ?? ""} className="p-0" playbackRate={0.75} />
              <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">
                Slow
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attempt / result */}
      <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          {result && grade ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn("rounded-2xl border p-4", grade.banner)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{grade.label}</p>
                  <Badge className="rounded-lg border-none bg-background/60 px-2.5 py-1 text-[11px] font-bold tabular-nums text-foreground">
                    {result.similarity}% match · {result.wordAccuracy}% words
                  </Badge>
                </div>
              </motion.div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  You said
                </p>
                <p className="mt-1.5 font-medium text-foreground">{spoken}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={retrySentence}
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-border bg-background px-6 text-sm font-bold hover:bg-accent active:scale-95 sm:h-14"
                >
                  <RotateCcw size={18} className="mr-2" /> Try Again
                </Button>
                <Button
                  onClick={nextSentence}
                  className={cn(
                    "h-12 w-full rounded-2xl px-6 text-sm font-bold text-white shadow-lg transition-all active:scale-95 sm:h-14",
                    result.grade === "perfect"
                      ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                      : "bg-foreground text-background",
                  )}
                >
                  {index + 1 >= items.length ? (
                    <>
                      <Award size={18} className="mr-2" /> See Session Summary
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} className="mr-2" /> Next Sentence
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <button
                  onClick={() => (listening ? speech.stop() : playThenListen(sentence?.ko ?? ""))}
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95",
                    listening
                      ? "animate-pulse bg-rose-600 shadow-rose-600/30"
                      : "bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-700",
                  )}
                >
                  {listening ? <Square size={28} /> : <Mic size={28} />}
                </button>
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm font-bold text-muted-foreground"
                >
                  {listening
                    ? "Repeat the sentence — pauses are okay, it grades a moment after you finish."
                    : "Tap to hear it again and repeat"}
                </p>
                {speech.transcript && listening && (
                  <p className="text-center font-medium text-foreground">{speech.transcript}</p>
                )}
              </div>
              {speech.error && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
                  <p className="text-sm font-bold leading-relaxed text-destructive">
                    {speech.error}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={nextSentence}
                className="h-11 w-full rounded-2xl border-border bg-background px-6 text-sm font-bold text-muted-foreground hover:bg-accent active:scale-95"
              >
                Skip this sentence
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
