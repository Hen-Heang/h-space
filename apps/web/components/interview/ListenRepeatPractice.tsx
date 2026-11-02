"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  ArrowRight,
  Keyboard,
  Languages,
  Loader2,
  Mic,
  Repeat2,
  RotateCcw,
  Square,
} from "lucide-react"

import { MicAccessNotice } from "@/components/interview/MicAccessNotice"
import {
  REPEAT_MATCH_DISCLAIMER,
  ScoreHonestyNote,
  TYPED_ATTEMPT_NOTE,
} from "@/components/interview/ScoreHonestyNote"
import { SpeakButton, getCachedAudioUrl } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAnswerMode } from "@/hooks/useAnswerMode"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { interviewApi } from "@/lib/api"
import { interviewScriptStorageKeys, pickNewerScript } from "@/lib/exam-prep-home"
import { INTERVIEW_TOPICS } from "@/lib/interview"
import {
  REPEAT_GRADE_LABELS,
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
// browser's single-utterance capture cuts off at the first ~1s pause — too
// short for multi-clause script sentences — so the mic runs continuously and
// this timer decides when the sentence is finished.
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
  /** Matched sentences ("perfect" grade); the field name is stored data. */
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

// Reads the script editor's newest copy: this device's autosave or the
// account copy, whichever was saved last.
async function loadNewestScript(topicId: string): Promise<Record<string, string> | null> {
  const keys = interviewScriptStorageKeys(topicId)
  let local = null
  try {
    const raw = window.localStorage.getItem(keys.sections)
    if (raw) {
      local = {
        sections: JSON.parse(raw) as Record<string, string>,
        updatedAt: window.localStorage.getItem(keys.updatedAt),
      }
    }
  } catch {
    local = null
  }
  let remote = null
  try {
    const saved = await interviewApi.getScript(topicId)
    if (saved) remote = { sections: saved.sections ?? {}, updatedAt: saved.updatedAt }
  } catch {
    // Offline: the local copy (or the drafted script) still makes a full drill.
  }
  return pickNewerScript(local, remote)?.sections ?? null
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

const GRADE_TONES = {
  perfect: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  good: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  retry: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300",
} as const

/**
 * Listen & Repeat (formerly the Repeat Drill): hear a sentence of your script
 * or a key phrase, say it back, and see which words the recognizer found. Used
 * as a tab of My exam script and on /interview/repeat. Matching is local
 * (lib/repeat-drill.ts) — no AI call.
 */
export function ListenRepeatPractice({
  scriptSections,
}: {
  /** The editor's live sections (embedded); otherwise the newest saved copy is loaded. */
  scriptSections?: Record<string, string>
}) {
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")
  const topic = INTERVIEW_TOPICS[0]
  const sourceLabelId = useId()
  const typedId = useId()

  const [phase, setPhase] = useState<"setup" | "loading" | "drill" | "summary">("setup")
  const [source, setSource] = useState<RepeatSource>("script")
  const [items, setItems] = useState<RepeatSentence[]>([])
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<RepeatComparison | null>(null)
  const [spoken, setSpoken] = useState("")
  const [spokenWasTyped, setSpokenWasTyped] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState("")
  const [showEnglish, setShowEnglish] = useState(false)
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({})
  const [lastSession, setLastSession] = useState<LastSession | null>(loadLastSession)
  const [emptySource, setEmptySource] = useState(false)

  // The graded sentence comes from refs: onResult fires from the recognition
  // engine, whose callback closure may be a render behind.
  const itemsRef = useRef<RepeatSentence[]>([])
  const indexRef = useRef(0)
  const drillActiveRef = useRef(false)
  useEffect(() => {
    indexRef.current = index
  }, [index])

  // Grades one attempt against the current sentence, from the recognizer or
  // the typed fallback.
  function gradeAttempt(text: string, typed: boolean) {
    const sentence = itemsRef.current[indexRef.current]
    const said = text.trim()
    if (!sentence || !said || !drillActiveRef.current) return
    const comparison = compareRepeat(sentence.ko, said)
    setSpoken(said)
    setSpokenWasTyped(typed)
    setResult(comparison)
    setProgress((prev) => {
      const existing = prev[sentence.id]
      const best =
        existing && existing.best.similarity >= comparison.similarity ? existing.best : comparison
      return { ...prev, [sentence.id]: { tries: (existing?.tries ?? 0) + 1, best } }
    })
    void logActivity()
  }

  const speech = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    onResult: (transcript) => gradeAttempt(transcript, false),
  })
  const answerMode = useAnswerMode(speech)
  const typing = answerMode.typing
  const listening = speech.status === "listening"

  useEffect(
    () => () => {
      drillActiveRef.current = false
      stopSpeechAudio()
    },
    [],
  )

  // Read by the async play-then-listen chain, which may resolve renders later.
  const canAutoListenRef = useRef(answerMode.canAutoListen)
  useEffect(() => {
    canAutoListenRef.current = answerMode.canAutoListen
  }, [answerMode.canAutoListen])
  // Timers act through a ref so re-renders don't tie them to a stale stop().
  const speechRef = useRef(speech)
  useEffect(() => {
    speechRef.current = speech
  })

  // Auto-grade SILENCE_STOP_MS after the last recognized word.
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
      // Typing (chosen or forced): the learner answers in the box; never open the mic.
      if (played && drillActiveRef.current && canAutoListenRef.current) speech.start()
    })
  }

  function resetAttempt() {
    setResult(null)
    setSpoken("")
    setTypedAnswer("")
    setShowEnglish(false)
    speech.reset()
  }

  async function startDrill() {
    setPhase("loading")
    setEmptySource(false)
    setProgress({})
    setIndex(0)
    resetAttempt()

    let queue: RepeatSentence[]
    if (source === "script") {
      // Blank sections fall back to the drafted script, like the editor.
      const sections = scriptSections ?? (await loadNewestScript(topic.id))
      queue = scriptToRepeatSentences(topic, sections)
    } else {
      queue = phrasesToRepeatSentences(topic.prep?.keyPhrases ?? [])
    }
    if (queue.length === 0) {
      setEmptySource(true)
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
    const sentence = items[index]
    if (!sentence) return
    resetAttempt()
    playThenListen(sentence.ko)
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
      // The summary still renders for this session.
    }
    setLastSession(summary)
    setPhase("summary")
  }

  function nextSentence() {
    resetAttempt()
    if (index + 1 >= items.length) {
      finishDrill()
      return
    }
    setIndex(index + 1)
    playThenListen(items[index + 1].ko)
  }

  function submitTyped() {
    if (!typedAnswer.trim()) return
    gradeAttempt(typedAnswer, true)
    setTypedAnswer("")
  }

  // ── Setup ───────────────────────────────────────────────────────────────
  if (phase === "setup" || phase === "loading") {
    const sources: { id: RepeatSource; label: string; description: string }[] = [
      {
        id: "script",
        label: "My script",
        description: "Your exam script, sentence by sentence in memorization order.",
      },
      {
        id: "phrases",
        label: "Key phrases",
        description: "Essential phrases and safety sentences from the study pack.",
      },
    ]
    return (
      <section aria-labelledby={sourceLabelId} className="app-surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 id={sourceLabelId} className="flex items-center gap-2 text-base font-semibold">
            <Repeat2 aria-hidden="true" className="size-4 text-primary" />
            Listen &amp; Repeat
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hear a sentence, say it back, and see which words were recognized — the fastest way to
            memorize your script out loud.
          </p>
          {lastSession && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last time: {lastSession.perfect} of {lastSession.total} matched
            </p>
          )}
        </div>

        <div role="radiogroup" aria-label="What to repeat" className="grid gap-2 sm:grid-cols-2">
          {sources.map((item) => {
            const active = source === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSource(item.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-3.5 shrink-0 rounded-full border-2",
                    active ? "border-primary bg-primary" : "border-muted-foreground/50",
                  )}
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        <MicAccessNotice access={answerMode.access} typing={typing} />
        {typing && (
          <p className="text-xs text-muted-foreground">
            You&apos;ll type each sentence after hearing it. {TYPED_ATTEMPT_NOTE}
          </p>
        )}
        {emptySource && (
          <p role="alert" className="text-sm text-destructive">
            There&apos;s nothing to repeat yet — write a section of your script first.
          </p>
        )}

        <Button
          size="lg"
          onClick={() => void startDrill()}
          disabled={phase === "loading"}
          className="h-12 w-full sm:w-auto"
        >
          {phase === "loading" ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" /> Preparing sentences…
            </>
          ) : (
            <>
              <Repeat2 aria-hidden="true" /> Start Listen &amp; Repeat
            </>
          )}
        </Button>
      </section>
    )
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const attempted = items.filter((s) => progress[s.id])
    const matched = attempted.filter((s) => progress[s.id].best.grade === "perfect")
    const weak = attempted.filter((s) => progress[s.id].best.grade !== "perfect")
    return (
      <div className="space-y-4">
        <section className="app-surface space-y-3 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Listen &amp; Repeat complete</h2>
          <p className="text-sm text-muted-foreground">
            {attempted.length === 0
              ? "No sentences answered this time — start again and say at least one out loud."
              : weak.length === 0
                ? `All ${attempted.length} sentences matched — your script is getting into your voice.`
                : `${matched.length} of ${attempted.length} sentences matched. Repeat the ones below once more; missed words are marked.`}
          </p>
          {attempted.length > 0 && <ScoreHonestyNote>{REPEAT_MATCH_DISCLAIMER}</ScoreHonestyNote>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={() => void startDrill()} className="h-12">
              <RotateCcw aria-hidden="true" /> Repeat again
            </Button>
            <Button size="lg" variant="outline" onClick={() => setPhase("setup")} className="h-12">
              Change what to repeat
            </Button>
          </div>
        </section>
        {weak.map((s) => {
          const best = progress[s.id].best
          return (
            <div key={s.id} className="app-surface space-y-2 p-5">
              <p className="text-xs text-muted-foreground">
                {s.sourceLabel} · best {best.wordAccuracy}% of words found
              </p>
              <div className="flex items-start justify-between gap-3">
                <p lang="ko" className="break-keep text-lg font-semibold leading-relaxed">
                  {best.marks.map((mark, i) => (
                    <span
                      key={i}
                      className={
                        mark.hit
                          ? "text-foreground"
                          : "text-rose-700 underline decoration-rose-400 decoration-2 underline-offset-4 dark:text-rose-300"
                      }
                    >
                      {mark.word}{" "}
                    </span>
                  ))}
                </p>
                <SpeakButton text={s.ko} className="mt-0.5 shrink-0 p-1.5" />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Drill ───────────────────────────────────────────────────────────────
  const sentence = items[index]
  const matchedCount = Object.values(progress).filter((p) => p.best.grade === "perfect").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Listen &amp; Repeat</span> · sentence{" "}
          {index + 1} of {items.length} · {matchedCount} matched
        </p>
        <Button variant="ghost" size="sm" onClick={finishDrill} className="h-10">
          Finish
        </Button>
      </div>

      <section aria-label="Sentence to repeat" className="app-surface space-y-4 p-5 sm:p-6">
        <p className="text-xs font-medium text-muted-foreground">{sentence?.sourceLabel}</p>
        <p
          lang="ko"
          className="break-keep text-[1.4rem] font-semibold leading-snug text-foreground sm:text-2xl"
        >
          {result
            ? result.marks.map((mark, i) => (
                <span
                  key={i}
                  className={
                    mark.hit
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 underline decoration-rose-400 decoration-2 underline-offset-4 dark:text-rose-300"
                  }
                >
                  {mark.word}{" "}
                </span>
              ))
            : sentence?.ko}
        </p>
        {sentence?.en && showEnglish && (
          <p className="text-sm text-muted-foreground">{sentence.en}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
            <SpeakButton text={sentence?.ko ?? ""} className="p-0" /> Normal
          </span>
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
            <SpeakButton text={sentence?.ko ?? ""} className="p-0" playbackRate={0.75} /> Slow
          </span>
          {sentence?.en && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEnglish((value) => !value)}
              aria-expanded={showEnglish}
              className="h-11"
            >
              <Languages aria-hidden="true" /> {showEnglish ? "Hide English" : "Show English"}
            </Button>
          )}
        </div>
      </section>

      <section aria-label="Your repeat" className="app-surface space-y-4 p-5 sm:p-6">
        {result ? (
          <>
            <div
              role="status"
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4",
                GRADE_TONES[result.grade],
              )}
            >
              <p className="text-sm font-semibold">{REPEAT_GRADE_LABELS[result.grade]}</p>
              <p className="text-xs font-semibold tabular-nums">
                {result.wordAccuracy}% of words found · {result.similarity}% similar
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {spokenWasTyped ? "You typed" : "Recognized as"}
              </p>
              <p lang="ko" className="mt-1.5 break-keep text-foreground">
                {spoken}
              </p>
            </div>
            <ScoreHonestyNote>
              {spokenWasTyped ? TYPED_ATTEMPT_NOTE : REPEAT_MATCH_DISCLAIMER}
            </ScoreHonestyNote>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" variant="outline" onClick={retrySentence} className="h-12 flex-1">
                <RotateCcw aria-hidden="true" /> Try again
              </Button>
              <Button size="lg" onClick={nextSentence} className="h-12 flex-1">
                {index + 1 >= items.length ? "See summary" : "Next sentence"}{" "}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <MicAccessNotice
              access={answerMode.access}
              typing={typing}
              onRetry={() => {
                answerMode.setTypingRequested(false)
                speech.start()
              }}
            />
            {typing ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitTyped()
                }}
              >
                <label htmlFor={typedId} className="block text-sm font-semibold text-foreground">
                  Type the sentence you heard
                </label>
                <Input
                  id={typedId}
                  lang="ko"
                  autoComplete="off"
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder="들은 문장을 입력하세요"
                  className="h-12 rounded-xl text-base"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" size="lg" disabled={!typedAnswer.trim()} className="h-12">
                    Check
                  </Button>
                  {!answerMode.typingForced && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => answerMode.setTypingRequested(false)}
                      className="h-12"
                    >
                      <Mic aria-hidden="true" /> Use the microphone
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <button
                  type="button"
                  onClick={() => (listening ? speech.stop() : playThenListen(sentence?.ko ?? ""))}
                  aria-label={
                    listening ? "Stop and check my repeat" : "Play the sentence, then repeat it"
                  }
                  aria-pressed={listening}
                  className={cn(
                    "flex size-20 items-center justify-center rounded-full text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    listening ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90",
                  )}
                >
                  {listening ? (
                    <Square aria-hidden="true" className="size-7 fill-current" />
                  ) : (
                    <Mic aria-hidden="true" className="size-8" />
                  )}
                </button>
                <p role="status" aria-live="polite" className="text-sm font-medium text-foreground">
                  {listening
                    ? "Repeat the sentence — it checks a moment after you finish."
                    : "Tap to hear it again and repeat"}
                </p>
                {speech.transcript && listening && (
                  <p lang="ko" className="break-keep text-foreground">
                    {speech.transcript}
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (listening) speech.reset()
                    answerMode.setTypingRequested(true)
                  }}
                  className="h-11 text-sm text-muted-foreground"
                >
                  <Keyboard aria-hidden="true" /> Type it instead
                </Button>
              </div>
            )}
            {speech.error &&
              !["permission", "no-mic", "unsupported"].includes(speech.errorKind ?? "") && (
                <p role="alert" className="text-sm text-destructive">
                  {speech.error}
                </p>
              )}
            <Button
              variant="ghost"
              onClick={nextSentence}
              className="h-11 w-full text-sm text-muted-foreground"
            >
              Skip this sentence
            </Button>
          </>
        )}
      </section>
    </div>
  )
}
