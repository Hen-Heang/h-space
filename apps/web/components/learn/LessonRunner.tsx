"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react"

import { LanguageAidsBar, useLanguageAids } from "@/components/learn/LanguageAids"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { useFoundationsLesson } from "@/hooks/useFoundations"
import { seedLessonsByTrack } from "@/lib/foundations-curriculum"
import { lessonAfter } from "@/lib/learning/course"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LessonAttemptResult, LessonExercise } from "@/lib/types"

type Phase = "teach" | "practice" | "result"

const FOUNDATIONS_HREF = "/phrasebook?mode=foundations"

// Local correctness check for immediate per-question feedback. The authoritative
// score still comes from `complete()` (server-side when wired) at the end.
function isCorrect(exercise: LessonExercise, answer: number | string | undefined): boolean {
  if (exercise.type === "multiple-choice") return answer === exercise.answerIndex
  return (
    String(answer ?? "")
      .trim()
      .toLowerCase() === (exercise.answer ?? "").trim().toLowerCase()
  )
}

// Options and prompts mix Korean and English; mark only the Korean ones.
const hasHangul = (text: string) => /[ᄀ-ᇿ㄰-㆏가-힯]/.test(text)

export function LessonRunner({ lessonId }: { lessonId: string }) {
  const { lesson, loading, error, complete } = useFoundationsLesson(lessonId)
  // Framer's stagger/slide-in entrance isn't covered by the sitewide
  // prefers-reduced-motion CSS rule (that only catches CSS transitions), so
  // it's opted out explicitly here — content just appears, no motion.
  const reduceMotion = useReducedMotion()
  const container = reduceMotion ? undefined : containerVariants
  const item = reduceMotion ? undefined : itemVariants
  // Lessons always showed both before these toggles existed — keep that as the
  // default. English here means the example translations; each card's
  // meaning (the sound, for Hangul) is the lesson itself and stays visible.
  const { showRomanization, showEnglish, aids, romanizationAllowed, toggle } = useLanguageAids(
    "foundations-lesson",
    { romanization: true, english: true },
  )

  const [phase, setPhase] = useState<Phase>("teach")
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Array<number | string>>([])
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<LessonAttemptResult | null>(null)
  const [submitError, setSubmitError] = useState("")

  const exercises = lesson?.exercises ?? []
  const current = exercises[step]
  const progressPct = useMemo(
    () => (exercises.length === 0 ? 0 : Math.round((step / exercises.length) * 100)),
    [step, exercises.length],
  )
  const trackLessons = useMemo(() => (lesson ? seedLessonsByTrack(lesson.track) : []), [lesson])
  const position = lesson ? trackLessons.findIndex((l) => l.id === lesson.id) + 1 : 0
  const next = lesson ? lessonAfter(trackLessons, lesson.id) : undefined

  function resetRun() {
    setPhase("teach")
    setStep(0)
    setAnswers([])
    setRevealed(false)
    setTyped("")
    setResult(null)
    setSubmitError("")
  }

  function chooseOption(optionIndex: number) {
    if (revealed) return
    setAnswers((prev) => {
      const next = [...prev]
      next[step] = optionIndex
      return next
    })
    setRevealed(true)
  }

  function checkTyped() {
    if (revealed || !typed.trim()) return
    setAnswers((prev) => {
      const next = [...prev]
      next[step] = typed.trim()
      return next
    })
    setRevealed(true)
  }

  async function goNext() {
    if (step < exercises.length - 1) {
      setStep((s) => s + 1)
      setRevealed(false)
      setTyped("")
      return
    }
    // Last question answered — submit the full attempt.
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await complete(answers)
      setResult(res)
      setPhase("result")
    } catch {
      setSubmitError("Could not save your result. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="space-y-6">
        <ErrorBanner>{error || "Lesson not found."}</ErrorBanner>
        <Button variant="outline" asChild>
          <Link href={FOUNDATIONS_HREF}>
            <ArrowLeft aria-hidden="true" /> Back to Foundations
          </Link>
        </Button>
      </div>
    )
  }

  const answeredCorrectly = current ? isCorrect(current, answers[step]) : false

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={container}
      className="mx-auto max-w-3xl space-y-6 pb-16"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between gap-3">
        <Link
          href={FOUNDATIONS_HREF}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" size={16} /> Foundations
        </Link>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
          {lesson.track} · Lesson {position} of {trackLessons.length}
        </span>
      </motion.div>

      <motion.div variants={item}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {lesson.title}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">{lesson.subtitle}</p>
      </motion.div>

      {/* ── Teach phase ── */}
      {phase === "teach" && (
        <>
          <motion.div
            variants={item}
            className="rounded-lg border border-primary/15 bg-primary/5 p-5 text-sm leading-relaxed text-foreground"
          >
            {lesson.intro}
          </motion.div>

          {/* Not sticky: the shell's sticky header sits at top-0 with a
              height that depends on the device's safe-area inset. */}
          <motion.div variants={item}>
            <LanguageAidsBar
              aids={aids}
              romanizationAllowed={romanizationAllowed}
              onToggle={toggle}
            />
          </motion.div>

          <motion.ol variants={container} className="grid gap-3">
            {lesson.cards.map((card, i) => (
              <motion.li
                key={i}
                variants={item}
                className="app-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-5"
              >
                <div className="flex min-w-24 flex-col items-center justify-center rounded-lg bg-muted px-4 py-3 text-center">
                  <span lang="ko" className="text-4xl font-bold leading-tight text-foreground">
                    {card.hangul}
                  </span>
                  {showRomanization && card.romanization && (
                    <span className="mt-1 text-sm text-muted-foreground">{card.romanization}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold text-foreground">{card.meaning}</p>
                    <SpeakButton
                      text={card.hangul}
                      title={`Listen to ${card.hangul}`}
                      className="shrink-0"
                    />
                  </div>
                  {card.example && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base leading-7 text-muted-foreground">
                        <span lang="ko" className="break-keep font-semibold text-foreground">
                          {card.example}
                        </span>
                        {showEnglish && card.exampleTranslation && (
                          <span> — {card.exampleTranslation}</span>
                        )}
                      </p>
                      <SpeakButton
                        text={card.example}
                        title="Listen to the example"
                        className="shrink-0"
                      />
                    </div>
                  )}
                  {card.note && (
                    <p className="rounded-md bg-amber-50/70 px-3 py-2 text-sm leading-6 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                      {card.note}
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div variants={item} className="flex justify-end">
            <Button
              type="button"
              size="lg"
              onClick={() => setPhase("practice")}
              disabled={exercises.length === 0}
              className="w-full sm:w-auto"
            >
              <Sparkles aria-hidden="true" />
              Start practice
            </Button>
          </motion.div>
        </>
      )}

      {/* ── Practice phase ── */}
      {phase === "practice" && current && (
        <>
          {/* Progress bar */}
          <motion.div variants={item} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span aria-live="polite">
                Question {step + 1} of {exercises.length}
              </span>
              <span aria-hidden="true">{progressPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Practice progress"
              aria-valuemin={0}
              aria-valuemax={exercises.length}
              aria-valuenow={step}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </motion.div>

          <motion.div key={current.id} variants={item} className="app-surface p-6">
            <p
              lang={hasHangul(current.prompt) ? "ko" : undefined}
              className="text-base font-semibold text-foreground"
            >
              {current.prompt}
            </p>

            {/* Multiple choice */}
            {current.type === "multiple-choice" && (
              <div className="mt-4 space-y-2">
                {current.options?.map((opt, oi) => {
                  const chosen = answers[step] === oi
                  const correctOpt = revealed && oi === current.answerIndex
                  const wrongChoice = revealed && chosen && oi !== current.answerIndex
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={revealed}
                      aria-pressed={chosen}
                      onClick={() => chooseOption(oi)}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                        correctOpt &&
                          "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                        wrongChoice &&
                          "border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-200",
                        !revealed && "border-border bg-background text-foreground hover:bg-muted",
                        revealed &&
                          !correctOpt &&
                          !wrongChoice &&
                          "border-border bg-background text-muted-foreground",
                      )}
                    >
                      <span lang={hasHangul(opt) ? "ko" : undefined} className="text-lg">
                        {opt}
                      </span>
                      {correctOpt && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                          <CheckCircle2 aria-hidden="true" size={18} /> Correct answer
                        </span>
                      )}
                      {wrongChoice && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                          <XCircle aria-hidden="true" size={18} /> Your answer
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Type answer */}
            {current.type === "type-answer" && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={typed}
                  disabled={revealed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") checkTyped()
                  }}
                  aria-label="Your answer"
                  placeholder="Type your answer…"
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base font-medium text-foreground outline-none focus:border-primary disabled:opacity-70"
                />
                {!revealed && (
                  <Button type="button" onClick={checkTyped} disabled={!typed.trim()}>
                    Check
                  </Button>
                )}
              </div>
            )}

            {/* Result announcement + explanation + next */}
            <div aria-live="polite">
              {revealed && (
                <div className="mt-5 space-y-4">
                  <p
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold",
                      answeredCorrectly
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                        : "bg-red-500/10 text-red-800 dark:text-red-200",
                    )}
                  >
                    {answeredCorrectly ? (
                      <CheckCircle2 aria-hidden="true" size={16} />
                    ) : (
                      <XCircle aria-hidden="true" size={16} />
                    )}
                    {answeredCorrectly
                      ? "Correct!"
                      : current.type === "multiple-choice"
                        ? `Not quite. Answer: ${current.options?.[current.answerIndex ?? -1] ?? ""}`
                        : `Not quite. Answer: ${current.answer}`}
                  </p>
                  {current.explanation && (
                    <p className="rounded-lg bg-sky-50/60 px-4 py-3 text-sm leading-6 text-sky-800 dark:bg-sky-400/6 dark:text-sky-200">
                      {current.explanation}
                    </p>
                  )}
                  {submitError && <ErrorBanner>{submitError}</ErrorBanner>}
                  <div className="flex justify-end">
                    <Button type="button" size="lg" onClick={goNext} disabled={submitting}>
                      {submitting && <Loader2 aria-hidden="true" className="animate-spin" />}
                      {step < exercises.length - 1 ? "Next" : "Finish"}
                      {!submitting && <ArrowRight aria-hidden="true" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* ── Result phase ── */}
      {phase === "result" && result && (
        <motion.div variants={item} className="space-y-6">
          <div
            role="status"
            className={cn(
              "rounded-lg border p-8 text-center",
              result.completed
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-amber-500/20 bg-amber-500/5",
            )}
          >
            <div
              className={cn(
                "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                result.completed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              )}
            >
              {result.completed ? (
                <CheckCircle2 aria-hidden="true" size={28} />
              ) : (
                <RotateCcw aria-hidden="true" size={26} />
              )}
            </div>
            <p className="mt-4 text-2xl font-bold text-foreground">
              {result.score} / {result.total} correct
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {result.accuracy}% ·{" "}
              {result.completed ? "Lesson complete!" : "Almost — try once more to pass (60%)."}
            </p>
          </div>

          {/* Passed → the next lesson is the primary action; otherwise retry. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {result.completed && next ? (
              <Button size="lg" asChild>
                <Link href={`/learn/${next.id}`}>
                  Next lesson: {next.title}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              variant={result.completed ? "outline" : "default"}
              onClick={resetRun}
            >
              <RotateCcw aria-hidden="true" /> Practice again
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={FOUNDATIONS_HREF}>
                <BookOpen aria-hidden="true" /> All lessons
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
