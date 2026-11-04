"use client"

import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  ArrowLeft,
  ArrowLeftRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flame,
  Gauge,
  Headphones,
  Layers3,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { vocabApi } from "@/lib/api"
import { formatInterval, previewIntervalDays, RATINGS, type ReviewRating } from "@/lib/srs"
import { isCorrectTerm, shuffle } from "@/lib/vocab-review"
import { loadBestStreak, submitBestStreak } from "@/lib/vocab-best-streak-store"
import type { SentenceChallengeResponse, SentenceCheckResponse, VocabItem } from "@/lib/types"
import { getCachedAudioUrl, SpeakButton } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
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
import { toast } from "sonner"

// Memory Lab's fullscreen screens (setup, quiz, results) as a real modal
// dialog: focus is trapped inside and restored on close, Escape calls
// `onClose`, the page behind is hidden from assistive tech, and each screen
// has an accessible name. Focus lands on the dialog itself rather than its
// first button, so Space/Enter still reach FlashCard's flip shortcut instead
// of activating the back button.
function LabOverlay({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={contentRef}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          className="fixed inset-0 z-[60] flex flex-col bg-background outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function getChoices(correct: VocabItem, pool: VocabItem[]): VocabItem[] {
  const distractors = shuffle(pool.filter((w) => w.id !== correct.id)).slice(0, 3)
  return shuffle([correct, ...distractors])
}

// The romanized reading, shown under the term on every card variant. Size and
// spacing are passed in via className; the bracketed format is shared.
function Pronunciation({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null
  return <p className={cn("font-bold text-muted-foreground/70", className)}>[{text}]</p>
}

// Scale a card's headline down as the text gets longer, so long meanings and
// phrases fit the card on a phone instead of overflowing the fixed-height face.
function fitText(text: string | null | undefined, base: string, mid: string, small: string) {
  const len = text?.length ?? 0
  return len > 26 ? small : len > 14 ? mid : base
}

type Mode = "flashcard" | "choice" | "recall" | "listening" | "sentence"
type Phase = "idle" | "quiz" | "done"

/** How another screen can ask Memory Lab to open — see `autoStart` below. */
export type AutoStart = "session" | "setup"

type ReviewSessionProps = {
  dueToday: VocabItem[]
  // True backlog size (uncapped) — dueToday is capped at REVIEW_SESSION_SIZE,
  // so this is what tells the user "there's more waiting after this batch."
  dueCount: number
  allWords: VocabItem[]
  loading?: boolean
  onRate: (id: string, rating: ReviewRating) => void | Promise<void>
  // Set by a "Review this deck" button elsewhere on the page (e.g. VocabDeck)
  // to jump straight into the fullscreen setup screen pre-filtered to one
  // category. Cleared via onFocusHandled once consumed, so re-clicking the
  // same deck's button still re-triggers it.
  focusCategory?: string | null
  onFocusHandled?: () => void
  // Set from the "?review=" query param so another screen (the /practice
  // completion state, Study's recommendation card) can hand the learner
  // straight into a session instead of dropping them on the vocab page to
  // find the launch card themselves. "session" starts the next due batch
  // immediately; "setup" opens the fullscreen picker so they can choose a
  // bigger or narrower session. Cleared via onAutoStartHandled, like focusCategory.
  autoStart?: AutoStart | null
  onAutoStartHandled?: () => void
}

// Grade buttons: solid fill from the --grade-* theme tokens (globals.css) with
// a darker bottom edge for the "3D" press, the label, and the interval the
// card jumps to.
const GRADE_STYLES: Record<ReviewRating, { label: string; classes: string }> = {
  AGAIN: { label: "Again", classes: "bg-grade-again" },
  HARD: { label: "Hard", classes: "bg-grade-hard" },
  GOOD: { label: "Good", classes: "bg-grade-good" },
  EASY: { label: "Easy", classes: "bg-grade-easy" },
}

function GradeButtons({
  card,
  onGrade,
  showKeys = false,
}: {
  card: VocabItem
  onGrade: (rating: ReviewRating) => void
  /** Only FlashCard listens for the 1-4 keys. */
  showKeys?: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {RATINGS.map((rating, index) => (
        <button
          key={rating}
          type="button"
          onClick={() => onGrade(rating)}
          aria-keyshortcuts={showKeys ? String(index + 1) : undefined}
          className={cn(
            "relative flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-b-4 border-black/25 px-1 text-white transition-all active:translate-y-[3px] active:border-b-0",
            GRADE_STYLES[rating].classes,
          )}
        >
          <span className="max-w-full truncate text-xs font-bold uppercase tracking-wider">
            {GRADE_STYLES[rating].label}
          </span>
          <span className="max-w-full truncate text-xs font-semibold opacity-90">
            {formatInterval(previewIntervalDays(card, rating))}
          </span>
          {/* Keyboard hint — FlashCard maps 1-4 to these, Anki-style. */}
          {showKeys && (
            <kbd
              aria-hidden="true"
              className="absolute right-1.5 top-1 hidden font-mono text-xs opacity-70 [@media(pointer:fine)]:block"
            >
              {index + 1}
            </kbd>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Flashcard ────────────────────────────────────────────────────────────────
function FlashCard({
  card,
  reversed = false,
  onGrade,
}: {
  card: VocabItem
  reversed?: boolean
  onGrade: (rating: ReviewRating) => void | Promise<void>
}) {
  const [flipped, setFlipped] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)

  const grade = useCallback(
    (rating: ReviewRating) => {
      setFlipped(false)
      setHint(null)
      onGrade(rating)
    },
    [onGrade],
  )

  // Space/Enter flips, then 1-4 grade Again/Hard/Good/Easy (Anki keys)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        grade(RATINGS[Number(e.key) - 1])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flipped, grade])

  async function fetchHint() {
    if (hint || loadingHint) return
    setLoadingHint(true)
    try {
      const res = await vocabApi.lookup(card.term)
      setHint(
        res.example
          ? `${res.example}${res.exampleTranslation ? ` / ${res.exampleTranslation}` : ""}`
          : res.definition,
      )
    } catch {
      setHint("Could not load hint. Please try again.")
    } finally {
      setLoadingHint(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Flip card — Duolingo-style chunky rounded card */}
      <div className="perspective-[1000px] h-[min(26rem,58dvh)] sm:h-96">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative h-full w-full transform-3d"
        >
          {/* Front */}
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="absolute inset-0 backface-hidden flex flex-col overflow-y-auto rounded-3xl border-2 border-b-[6px] border-border bg-card p-6 text-center dark:bg-slate-900/60 sm:rounded-3xl sm:p-8"
          >
            {/* m-auto centers when the content fits and keeps it reachable via
                scroll when a long meaning/example makes it taller than the card. */}
            <span className="m-auto flex w-full flex-col items-center">
              <span className="mb-6 rounded-full bg-accent/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {reversed ? "English" : "Korean"}
              </span>
              <p
                className={cn(
                  "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
                  fitText(
                    reversed ? card.meaning : card.term,
                    "text-5xl sm:text-7xl",
                    "text-4xl sm:text-5xl",
                    "text-2xl sm:text-4xl",
                  ),
                )}
              >
                <span lang={reversed ? undefined : "ko"}>
                  {reversed ? card.meaning : card.term}
                </span>
              </p>
              {!reversed && (
                <Pronunciation text={card.pronunciation} className="mt-4 text-xl sm:text-3xl" />
              )}
              <span className="mt-10 flex items-center gap-2 rounded-2xl border-2 border-b-4 border-border bg-accent/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tap to Reveal
              </span>
            </span>
          </button>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col overflow-y-auto rounded-3xl border-2 border-b-[6px] border-[#58cc02]/40 bg-[#58cc02]/[0.06] p-6 text-center dark:bg-[#58cc02]/[0.08] sm:rounded-3xl sm:p-8">
            <div className="m-auto flex w-full flex-col items-center">
              <span className="mb-4 rounded-full bg-[#58cc02]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#58a302] dark:text-[#89e219]">
                {reversed ? "Korean" : "Meaning"}
              </span>
              <p
                className={cn(
                  "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
                  fitText(
                    reversed ? card.term : card.meaning,
                    "text-3xl sm:text-5xl",
                    "text-2xl sm:text-4xl",
                    "text-xl sm:text-3xl",
                  ),
                )}
              >
                <span lang={reversed ? "ko" : undefined}>
                  {reversed ? card.term : card.meaning}
                </span>
              </p>
              <Pronunciation text={card.pronunciation} className="mt-2 text-base sm:text-2xl" />
              {/* Always surface the other side too, so each card reinforces Korean + reading + meaning together. */}
              <p className="mt-2 break-keep text-lg font-bold text-muted-foreground/80 [overflow-wrap:anywhere] sm:text-2xl">
                <span lang={reversed ? undefined : "ko"}>
                  {reversed ? card.meaning : card.term}
                </span>
              </p>

              {card.example && (
                <div className="mt-6 w-full max-w-sm rounded-2xl border-2 border-[#58cc02]/20 bg-card/80 p-4 text-sm font-bold leading-relaxed text-muted-foreground">
                  {card.example}
                </div>
              )}

              <div className="mt-6 sm:mt-8">
                <SpeakButton
                  text={card.term}
                  className="h-14 w-14 rounded-2xl border-b-4 border-[#1499e0] bg-[#1cb0f6] text-white transition-all active:translate-y-[3px] active:border-b-0"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* AI Hint Section */}
            <div className="rounded-2xl border-2 border-[#ffc800]/40 bg-[#ffc800]/10 p-4">
              {hint ? (
                <p className="text-sm font-bold leading-relaxed text-[#b88600] dark:text-[#ffd43b]">
                  {hint}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={fetchHint}
                  disabled={loadingHint}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b88600] hover:text-[#9a7100] dark:text-[#ffd43b]"
                >
                  <Lightbulb
                    size={14}
                    strokeWidth={2.5}
                    className={loadingHint ? "animate-pulse" : ""}
                  />
                  {loadingHint ? "Creating AI sentence..." : "Get AI example sentence"}
                </button>
              )}
            </div>

            {/* Grading Buttons (Duolingo-style, keys 1-4) */}
            <GradeButtons card={card} onGrade={grade} showKeys />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Correct-answer reaction ─────────────────────────────────────────────────
// A celebratory burst shown the instant a test answer is right. The combo
// (consecutive correct answers this session) escalates the praise so a hot
// streak feels rewarding and keeps the learner motivated.
const PRAISE = ["Nice!", "잘했어요!", "Perfect!", "You got it!", "Excellent!", "Spot on!"]

function praiseFor(combo: number): string {
  if (combo >= 10) return "Unstoppable! 🚀"
  if (combo >= 5) return "On fire! 🔥"
  if (combo >= 3) return `${combo} in a row! ⚡`
  return PRAISE[Math.floor(Math.random() * PRAISE.length)]
}

// Light haptic tap on supported mobile devices — a tiny "yes!" you can feel.
function buzz() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(15)
  }
}

function CorrectReaction({ combo }: { combo: number }) {
  const message = useMemo(() => praiseFor(combo), [combo])
  const emojis = combo >= 5 ? ["🔥", "⭐", "🎉", "✨", "💪", "🚀"] : ["🎉", "✨", "⭐", "👏"]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      className="relative flex items-center justify-center gap-2 overflow-visible rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3"
    >
      {/* floating emoji burst */}
      <div className="pointer-events-none absolute inset-x-0 top-0">
        {emojis.map((e, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -52 - i * 3 }}
            transition={{ duration: 1, delay: i * 0.05, ease: "easeOut" }}
            className="absolute left-1/2 top-1 text-lg"
            style={{ marginLeft: (i - (emojis.length - 1) / 2) * 28 }}
          >
            {e}
          </motion.span>
        ))}
      </div>
      <CheckCircle2 size={18} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
      <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
        {message}
      </span>
    </motion.div>
  )
}

// ─── Multiple choice ───────────────────────────────────────────────────────────
function ChoiceCard({
  card,
  allWords,
  streak,
  onResult,
  onKnew,
  onLearning,
}: {
  card: VocabItem
  allWords: VocabItem[]
  streak: number
  onResult: (correct: boolean) => void
  onKnew: () => void | Promise<void>
  onLearning: () => void
}) {
  const choices = useMemo(() => getChoices(card, allWords), [card, allWords])
  const [selected, setSelected] = useState<string | null>(null)
  const answered = selected !== null

  function pick(id: string) {
    if (answered) return
    setSelected(id)
    const correct = id === card.id
    onResult(correct)
    if (correct) buzz()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt Card */}
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-accent/5 p-6 text-center dark:bg-white/5 sm:rounded-3xl sm:p-10">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
          Select Meaning
        </span>
        <p
          className={cn(
            "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
            fitText(
              card.term,
              "text-5xl sm:text-7xl",
              "text-4xl sm:text-5xl",
              "text-2xl sm:text-4xl",
            ),
          )}
        >
          <span lang="ko">{card.term}</span>
        </p>
        <Pronunciation text={card.pronunciation} className="mt-3 text-lg sm:text-2xl" />
        <div className="mt-6">
          <SpeakButton
            text={card.term}
            className="h-10 w-10 rounded-xl bg-background shadow-sm ring-1 ring-border/50"
          />
        </div>
      </div>

      {/* Choices List */}
      <div className="grid gap-3">
        {choices.map((choice, i) => {
          const isCorrect = choice.id === card.id
          const isSelected = choice.id === selected

          return (
            <motion.button
              key={choice.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              type="button"
              onClick={() => pick(choice.id)}
              disabled={answered}
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-all active:scale-[0.98] sm:px-6 sm:py-5",
                !answered
                  ? "border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]"
                  : isCorrect
                    ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                    : isSelected
                      ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/20"
                      : "border-border/40 bg-accent/10 opacity-40",
              )}
            >
              <span
                className={cn(
                  "min-w-0 text-base font-bold [overflow-wrap:anywhere] sm:text-lg",
                  !answered
                    ? "text-foreground"
                    : isCorrect
                      ? "text-emerald-700 dark:text-emerald-400"
                      : isSelected
                        ? "text-red-700 dark:text-red-400"
                        : "text-muted-foreground",
                )}
              >
                {choice.meaning}
              </span>
              {answered && isCorrect && (
                <CheckCircle2 size={18} className="text-emerald-600" strokeWidth={3} />
              )}
              {answered && isSelected && !isCorrect && (
                <XCircle size={18} className="text-red-600" strokeWidth={3} />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Immediate Result / Next Button */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 space-y-3"
          >
            {selected === card.id && <CorrectReaction combo={streak + 1} />}
            <button
              type="button"
              onClick={() => (selected === card.id ? onKnew() : onLearning())}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-sm font-bold uppercase tracking-wide text-white shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Next Word
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Typed recall ──────────────────────────────────────────────────────────────
function RecallCard({
  card,
  streak,
  onResult,
  onKnew,
  onLearning,
}: {
  card: VocabItem
  streak: number
  onResult: (correct: boolean) => void
  onKnew: () => void | Promise<void>
  onLearning: () => void
}) {
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null)
  const answered = result !== null

  function submit() {
    if (answered || !answer.trim()) return
    const correct = isCorrectTerm(answer, card.term)
    setResult(correct ? "correct" : "incorrect")
    onResult(correct)
    if (correct) buzz()
  }

  function next() {
    if (result === "correct") {
      onKnew()
    } else {
      onLearning()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt Card */}
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-accent/5 p-6 text-center dark:bg-white/5 sm:rounded-3xl sm:p-10">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
          Type in Korean
        </span>
        <p
          className={cn(
            "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
            fitText(
              card.meaning,
              "text-3xl sm:text-5xl",
              "text-2xl sm:text-4xl",
              "text-xl sm:text-3xl",
            ),
          )}
        >
          {card.meaning}
        </p>
        {card.pronunciation && answered && (
          <p className="mt-3 text-xs font-bold italic text-muted-foreground">
            [{card.pronunciation}]
          </p>
        )}
      </div>

      {/* Answer Input */}
      <div className="space-y-3">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            if (answered) {
              next()
            } else {
              submit()
            }
          }}
          disabled={answered}
          autoFocus
          lang="ko"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="한국어로 입력하세요..."
          className={cn(
            "h-16 w-full rounded-2xl border bg-card px-5 text-center text-xl font-bold tracking-tight text-foreground placeholder:text-base placeholder:font-bold placeholder:text-muted-foreground/60 focus:outline-none transition-colors",
            !answered
              ? "border-border focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
              : result === "correct"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
          )}
        />

        {!answered && (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!answer.trim()}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-40"
            >
              <CheckCircle2 size={18} strokeWidth={2.5} />
              Check
            </button>
            <button
              type="button"
              onClick={() => {
                setResult("incorrect")
                onResult(false)
              }}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-all hover:bg-accent active:scale-95"
            >
              <Eye size={16} strokeWidth={2.5} />
              Show
            </button>
          </div>
        )}
      </div>

      {/* Result + Next */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {result === "correct" && <CorrectReaction combo={streak + 1} />}
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border p-4",
                result === "correct"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-red-500/20 bg-red-500/5",
              )}
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    result === "correct" ? "text-emerald-600" : "text-red-500",
                  )}
                >
                  {result === "correct" ? "Correct" : "Answer"}
                </p>
                <p className="mt-1 break-keep text-2xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
                  <span lang="ko">{card.term}</span>
                </p>
                {card.example && (
                  <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground/70">
                    {card.example}
                  </p>
                )}
              </div>
              <SpeakButton
                text={card.term}
                className="h-11 w-11 shrink-0 rounded-xl bg-background shadow-sm ring-1 ring-border/50"
              />
            </div>

            <button
              type="button"
              onClick={next}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-sm font-bold uppercase tracking-wide text-white shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Next Word
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Audio-first (listening) ────────────────────────────────────────────────────
// Plays the Korean audio with the word hidden — you recall the meaning from
// sound alone, then reveal and self-grade. Trains listening, the hardest skill
// for a spoken exam. Auto-plays on mount; iOS may block that, so the big play
// button is the primary control.
function ListeningCard({
  card,
  onGrade,
}: {
  card: VocabItem
  onGrade: (rating: ReviewRating) => void | Promise<void>
}) {
  const [revealed, setRevealed] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [audioFailed, setAudioFailed] = useState(false)

  const play = useCallback(
    async (rate = 1) => {
      if (!card.term) return
      setLoadingAudio(true)
      setAudioFailed(false)
      try {
        const url = await getCachedAudioUrl(card.term)
        const audio = new Audio(url)
        audio.playbackRate = rate
        setLoadingAudio(false)
        setPlaying(true)
        audio.onended = () => setPlaying(false)
        await audio.play()
      } catch {
        // Autoplay blocked (often iOS without a gesture) or TTS unavailable.
        setLoadingAudio(false)
        setPlaying(false)
        setAudioFailed(true)
      }
    },
    [card.term],
  )

  // Auto-play once when the card appears. Kept separate from play() so the first
  // statement is an await (no setState synchronously in the effect body), and so
  // a card change cancels an in-flight play.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!card.term) return
      try {
        const url = await getCachedAudioUrl(card.term)
        if (cancelled) return
        const audio = new Audio(url)
        audio.onended = () => setPlaying(false)
        setPlaying(true)
        await audio.play()
      } catch {
        if (!cancelled) setAudioFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [card.term])

  const grade = useCallback(
    (rating: ReviewRating) => {
      setRevealed(false)
      onGrade(rating)
    },
    [onGrade],
  )

  // Keys: R replays, Space/Enter reveals, then 1-4 grade.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key.toLowerCase() === "r") {
        e.preventDefault()
        void play()
      } else if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        grade(RATINGS[Number(e.key) - 1])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [revealed, grade, play])

  return (
    <div className="flex flex-col gap-6">
      {/* Audio stage */}
      <div className="flex h-[min(26rem,58dvh)] flex-col items-center justify-center gap-6 rounded-3xl border-2 border-b-[6px] border-border bg-card p-6 text-center dark:bg-slate-900/60 sm:h-96 sm:rounded-3xl sm:p-8">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Listen &amp; Recall
        </span>

        {/* Big play button */}
        <button
          type="button"
          onClick={() => void play()}
          disabled={loadingAudio}
          aria-label="Play audio"
          className={cn(
            "flex h-28 w-28 items-center justify-center rounded-3xl border-b-4 text-white transition-all active:translate-y-[3px] active:border-b-0 disabled:opacity-60 sm:h-32 sm:w-32",
            "border-[#1499e0] bg-[#1cb0f6] shadow-lg shadow-[#1cb0f6]/30",
          )}
        >
          {loadingAudio ? (
            <Loader2 size={44} className="animate-spin" strokeWidth={2.5} />
          ) : (
            <Volume2 size={48} strokeWidth={2.5} className={playing ? "animate-pulse" : ""} />
          )}
        </button>

        <button
          type="button"
          onClick={() => void play(0.7)}
          className="flex items-center gap-2 rounded-full border-2 border-b-4 border-border bg-accent/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground/70 transition-all active:translate-y-[2px] active:border-b-2 hover:text-foreground"
        >
          <Gauge size={13} strokeWidth={3} /> Slow
        </button>

        {audioFailed && (
          <p className="text-xs font-bold text-muted-foreground">
            Tap the speaker to play the audio.
          </p>
        )}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-border bg-card text-sm font-bold uppercase tracking-wide text-foreground transition-all active:translate-y-[3px] active:border-b-0"
        >
          <Eye size={18} strokeWidth={2.5} /> Show Answer
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Answer reveal */}
          <div className="rounded-2xl border-2 border-[#58cc02]/40 bg-[#58cc02]/[0.06] p-5 text-center dark:bg-[#58cc02]/[0.08]">
            <p
              className={cn(
                "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
                fitText(
                  card.term,
                  "text-4xl sm:text-6xl",
                  "text-3xl sm:text-5xl",
                  "text-2xl sm:text-4xl",
                ),
              )}
            >
              <span lang="ko">{card.term}</span>
            </p>
            <Pronunciation text={card.pronunciation} className="mt-2 text-lg sm:text-2xl" />
            <p className="mt-3 break-keep text-xl font-bold text-muted-foreground [overflow-wrap:anywhere] sm:text-2xl">
              {card.meaning}
            </p>
            {card.example && (
              <p className="mx-auto mt-4 max-w-sm rounded-2xl border-2 border-[#58cc02]/20 bg-card/80 p-3 text-sm font-bold leading-relaxed text-muted-foreground">
                {card.example}
              </p>
            )}
          </div>

          <GradeButtons card={card} onGrade={grade} />
        </motion.div>
      )}
    </div>
  )
}

// ─── Sentence writing ──────────────────────────────────────────────────────────
// Shows the Korean term, fetches an AI challenge prompt, lets the learner write
// a sentence, then auto-grades the card (≥80 → GOOD, ≥50 → HARD, else → AGAIN).
function SentenceCard({
  card,
  onGrade,
}: {
  card: VocabItem
  onGrade: (rating: ReviewRating) => void | Promise<void>
}) {
  const [phase, setPhase] = useState<"loading" | "writing" | "checking" | "result">("loading")
  const [challenge, setChallenge] = useState<SentenceChallengeResponse | null>(null)
  const [attempt, setAttempt] = useState("")
  const [result, setResult] = useState<SentenceCheckResponse | null>(null)
  const [error, setError] = useState("")
  const [retryToken, setRetryToken] = useState(0)

  // No synchronous state resets here: the session remounts this component per
  // attempt (card key includes the attempt counter), so mount state is fresh.
  useEffect(() => {
    let active = true
    vocabApi
      .getSentenceChallenge(card.id)
      .then((data) => {
        if (active) {
          setChallenge(data)
          setPhase("writing")
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load the challenge.")
          setPhase("writing")
        }
      })
    return () => {
      active = false
    }
  }, [card.id, retryToken])

  function retryChallenge() {
    setError("")
    setPhase("loading")
    setRetryToken((t) => t + 1)
  }

  async function handleCheck() {
    if (!challenge || !attempt.trim() || phase === "checking") return
    setPhase("checking")
    setError("")
    try {
      const data = await vocabApi.checkSentence(card.id, {
        challengePrompt: challenge.challengePrompt,
        attempt: attempt.trim(),
      })
      setResult(data)
      setPhase("result")
    } catch {
      setError("Could not evaluate — please try again.")
      setPhase("writing")
    }
  }

  function advanceCard(rating: ReviewRating) {
    onGrade(rating)
  }

  const scoreColor = !result
    ? ""
    : result.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : result.score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  const scoreBg = !result
    ? ""
    : result.score >= 80
      ? "border-emerald-500/20 bg-emerald-500/5"
      : result.score >= 60
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-red-500/20 bg-red-500/5"

  return (
    <div className="flex flex-col gap-5">
      {/* Prompt card */}
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-accent/5 p-6 text-center dark:bg-white/5 sm:p-10">
        <span className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Write a Sentence
        </span>
        <p
          className={cn(
            "w-full break-keep font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
            fitText(
              card.term,
              "text-5xl sm:text-7xl",
              "text-4xl sm:text-5xl",
              "text-2xl sm:text-4xl",
            ),
          )}
        >
          <span lang="ko">{card.term}</span>
        </p>
        {card.pronunciation && (
          <p className="mt-3 text-lg font-bold text-muted-foreground sm:text-2xl">
            [{card.pronunciation}]
          </p>
        )}
        <p className="mt-2 break-keep text-lg font-bold text-muted-foreground/70 [overflow-wrap:anywhere]">
          {card.meaning}
        </p>
        <div className="mt-5">
          <SpeakButton
            text={card.term}
            className="h-10 w-10 rounded-xl bg-background shadow-sm ring-1 ring-border/50"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      {phase === "loading" && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
          <Loader2 size={16} className="animate-spin text-violet-500" />
          <span className="text-xs font-bold text-muted-foreground">
            Building your challenge...
          </span>
        </div>
      )}

      {/* Challenge failed to load — offer a retry, and let the learner still
          self-grade the card so the session can't dead-end here. */}
      {phase === "writing" && !challenge && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={retryChallenge}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-xs font-bold uppercase tracking-wide text-violet-600 transition-all hover:bg-violet-500/20 active:scale-95 dark:text-violet-400"
          >
            <RotateCcw size={14} strokeWidth={3} /> Retry challenge
          </button>
          <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Or rate this word yourself and continue
          </p>
          <GradeButtons card={card} onGrade={advanceCard} />
        </div>
      )}

      {(phase === "writing" || phase === "checking") && challenge && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Task
            </span>
            <p className="text-sm font-bold text-foreground leading-relaxed">
              {challenge.challengePrompt}
            </p>
            {challenge.contextHint && (
              <p className="text-xs font-medium text-muted-foreground italic">
                {challenge.contextHint}
              </p>
            )}
          </div>

          <textarea
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            disabled={phase === "checking"}
            placeholder={`Write your Korean sentence using "${card.term}"…`}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void handleCheck()
              }
            }}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-sm placeholder:text-muted-foreground/40 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20 disabled:opacity-60 transition-colors"
          />

          <button
            type="button"
            onClick={handleCheck}
            disabled={!attempt.trim() || phase === "checking"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            {phase === "checking" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Evaluating...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} strokeWidth={2.5} /> Check my sentence
              </>
            )}
          </button>
        </div>
      )}

      {phase === "result" && result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Score */}
          <div className={cn("rounded-2xl border p-4 flex items-center gap-4", scoreBg)}>
            <div className={cn("text-4xl font-bold tabular-nums", scoreColor)}>{result.score}</div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-bold uppercase tracking-wide", scoreColor)}>
                {result.correct ? "Good job" : "Keep practicing"}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground/80 leading-relaxed">
                {result.feedback}
              </p>
            </div>
          </div>

          {result.correctedSentence && result.correctedSentence !== attempt.trim() && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-1">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
                Corrected
              </span>
              <p className="text-sm font-bold text-foreground">{result.correctedSentence}</p>
            </div>
          )}

          {result.betterAlternative && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                More natural
              </span>
              <p className="text-sm font-bold text-foreground">{result.betterAlternative}</p>
            </div>
          )}

          {result.grammarNote && (
            <div className="flex items-start gap-2 rounded-2xl border border-border bg-accent/5 p-3">
              <Lightbulb
                size={13}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0 text-muted-foreground/50"
              />
              <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
                {result.grammarNote}
              </p>
            </div>
          )}

          {/* Grade buttons — score drives the recommendation, learner confirms */}
          <div className="space-y-2">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
              How well did you do?
            </p>
            <GradeButtons card={card} onGrade={advanceCard} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ReviewSession({
  dueToday,
  dueCount,
  allWords,
  loading,
  onRate,
  focusCategory,
  onFocusHandled,
  autoStart,
  onAutoStartHandled,
}: ReviewSessionProps) {
  // isOpen=false → compact launch card on the vocab page
  // isOpen=true  → fullscreen (idle setup → quiz → done)
  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [mode, setMode] = useState<Mode>("flashcard")
  const [reversed, setReversed] = useState(false)
  // Empty set reviews the whole deck; otherwise restricts the session (and
  // the quiz-mode distractor pool) to the chosen vocab categories.
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])
  const [queue, setQueue] = useState<VocabItem[]>([])
  // Fixed at session start — unlike queue.length, this doesn't grow when an
  // "Again" grade requeues a card, so the "X / Y" counter and progress bar
  // stay stable instead of silently inflating mid-session.
  const [sessionTotal, setSessionTotal] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  // Grade actions taken this session. currentIndex doesn't advance on "Again"
  // (the requeued card's replacement slides into the same array slot), so the
  // visible "X / Y" counter must track THIS instead — otherwise it freezes on
  // the same number while a different word is shown, reading as "I just
  // reviewed this, why does it still say I need to review?"
  const [attemptsCount, setAttemptsCount] = useState(0)
  const [lapsedIds, setLapsedIds] = useState<Set<string>>(new Set())
  const [knewCount, setKnewCount] = useState(0)
  // Consecutive correct answers this session (Quiz/Recall) — drives the
  // escalating correct-answer reaction. Resets on a wrong answer.
  const [streak, setStreak] = useState(0)
  // Longest streak reached this session — surfaced on the results screen.
  const [bestStreak, setBestStreak] = useState(0)
  // All-time best (persisted) and whether this session beat it.
  const [allTimeBest, setAllTimeBest] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  // Screen-reader note for the last choice/recall answer ("Correct." /
  // "Incorrect."), cleared when the card is graded.
  const [resultNote, setResultNote] = useState("")
  const [confirmLeave, setConfirmLeave] = useState(false)
  const registerResult = useCallback((correct: boolean) => {
    setResultNote(correct ? "Correct." : "Incorrect.")
    setStreak((s) => {
      const next = correct ? s + 1 : 0
      setBestStreak((b) => (next > b ? next : b))
      return next
    })
  }, [])

  // On session end, reconcile this session's best with the stored all-time best
  // (read fresh from the backend so a record set on another device still counts).
  useEffect(() => {
    if (phase !== "done") return
    let active = true
    ;(async () => {
      try {
        const stored = await loadBestStreak()
        if (bestStreak > stored) {
          const next = await submitBestStreak(bestStreak)
          if (!active) return
          setAllTimeBest(next)
          setIsNewRecord(true)
        } else {
          if (!active) return
          setAllTimeBest(stored)
          setIsNewRecord(false)
        }
      } catch {
        /* best-effort — the session result itself isn't affected */
      }
    })()
    return () => {
      active = false
    }
  }, [phase, bestStreak])

  // Distinct categories across the whole deck, for the picker — derived at
  // runtime since vocab categories are free-form strings, not a fixed enum.
  const categories = useMemo(
    () => Array.from(new Set(allWords.map((w) => w.category).filter(Boolean))).sort(),
    [allWords],
  )

  const filteredAllWords = useMemo(
    () =>
      selectedCategories.size === 0
        ? allWords
        : allWords.filter((w) => selectedCategories.has(w.category)),
    [allWords, selectedCategories],
  )
  const filteredDueToday = useMemo(
    () =>
      selectedCategories.size === 0
        ? dueToday
        : dueToday.filter((w) => selectedCategories.has(w.category)),
    [dueToday, selectedCategories],
  )

  const canUseChoice = filteredAllWords.length >= 4

  // A "Review this deck" button elsewhere on the page requested a scoped
  // session — open straight to the (pre-filtered) setup screen and let the
  // parent know so it can clear the request (otherwise re-clicking the same
  // deck's button wouldn't re-trigger, since the prop value wouldn't change).
  useEffect(() => {
    if (!focusCategory) return
    setSelectedCategories(new Set([focusCategory]))
    setPhase("idle")
    setIsOpen(true)
    onFocusHandled?.()
  }, [focusCategory, onFocusHandled])

  // Lock page scroll only when Memory Lab is open fullscreen.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  function startQuiz() {
    const deck = filteredDueToday.length > 0 ? filteredDueToday : filteredAllWords
    setQueue(shuffle(deck))
    setSessionTotal(deck.length)
    setCurrentIndex(0)
    setAttemptsCount(0)
    setLapsedIds(new Set())
    setKnewCount(0)
    setStreak(0)
    setBestStreak(0)
    setPendingSaves(0)
    setSaveError(false)
    setPhase("quiz")
  }

  // "?review=session" / "?review=setup" arrived from another screen — wait for
  // the deck to load (startQuiz reads it), then open. Falls back to the setup
  // screen when nothing is due, so the learner still lands somewhere they can
  // act rather than on an empty quiz.
  useEffect(() => {
    if (!autoStart || loading) return
    setSelectedCategories(new Set())
    setIsOpen(true)
    if (autoStart === "session" && dueToday.length > 0) {
      startQuiz()
    } else {
      setPhase("idle")
    }
    onAutoStartHandled?.()
    // startQuiz is recreated every render; the effect is keyed on the request
    // itself, which the parent clears once handled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, loading, dueToday.length])

  // Live sync status for the session header: how many ratings are in flight and
  // whether the last one failed to persist.
  const [pendingSaves, setPendingSaves] = useState(0)
  const [saveError, setSaveError] = useState(false)

  // Persist a rating with one retry. Grading stays optimistic (UI advances
  // immediately), but a failed save is retried once and then surfaced — so a
  // dropped review can't silently fail to sync to the user's other devices.
  const rateWithRetry = useCallback(
    async (id: string, rating: ReviewRating) => {
      setPendingSaves((p) => p + 1)
      try {
        try {
          await onRate(id, rating)
        } catch {
          await onRate(id, rating) // retry once
        }
        setSaveError(false)
      } catch {
        setSaveError(true)
        toast.error("Couldn't save that review", {
          description: "Check your connection — it may not have synced to your other devices.",
        })
      } finally {
        setPendingSaves((p) => Math.max(0, p - 1))
      }
    },
    [onRate],
  )

  const handleGrade = useCallback(
    (rating: ReviewRating) => {
      const card = queue[currentIndex]
      if (!card) return
      // Optimistic: advance instantly; rateWithRetry persists + surfaces failures.
      void rateWithRetry(card.id, rating)
      setAttemptsCount((a) => a + 1)
      setResultNote("")

      if (rating === "AGAIN") {
        setLapsedIds((prev) => new Set(prev).add(card.id))
        // Mirror the backend lapse so the card's grade previews are correct
        // when it comes back around later in this session.
        const lapsed: VocabItem = {
          ...card,
          repetitions: 0,
          intervalDays: 0,
          easeFactor: Math.max(1.3, card.easeFactor - 0.2),
          lapses: card.lapses + 1,
        }
        // Requeue at the end; queue length is unchanged so currentIndex stays
        // valid — the next card slides into this slot, or (when this was the
        // last card) the lapsed card itself comes right back. Never jump back
        // to 0: earlier slots hold cards that were already graded this session.
        setQueue((q) => {
          const next = [...q]
          next.splice(currentIndex, 1)
          next.push(lapsed)
          return next
        })
        return
      }

      setKnewCount((c) => c + 1)

      if (currentIndex + 1 >= queue.length) {
        setPhase("done")
      } else {
        setCurrentIndex((i) => i + 1)
      }
    },
    [queue, currentIndex, rateWithRetry],
  )

  // Stays fixed for the duration of the session — see sessionTotal above.
  const total = sessionTotal || queue.length

  // ── idle (full-width launch banner on the vocab page; the session itself
  //    opens as a fullscreen overlay) ─────────────────────────────────────────
  if (phase === "idle" && !isOpen) {
    const deckSize = filteredDueToday.length > 0 ? filteredDueToday.length : filteredAllWords.length
    const isDueSession = filteredDueToday.length > 0
    // dueCount is the true, uncapped backlog; filteredDueToday is the next
    // review batch (capped at REVIEW_SESSION_SIZE). They only line up once the
    // backlog is small enough to fit in one batch and no category filter is
    // narrowing the view — otherwise say so explicitly instead of showing two
    // unexplained different numbers on the same page.
    const hasMoreQueued = selectedCategories.size === 0 && dueCount > filteredDueToday.length
    const batch = filteredDueToday.length
    return (
      <section
        aria-labelledby="memory-lab-heading"
        className={cn(
          "app-surface p-5 sm:p-6",
          isDueSession && "border-primary/30 bg-linear-to-br from-primary/[0.06] to-card",
        )}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuit aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="app-kicker">Memory Lab</p>
              <h2
                id="memory-lab-heading"
                className="mt-1 text-xl font-semibold tracking-tight text-foreground"
              >
                {loading
                  ? "Loading your words…"
                  : isDueSession
                    ? `Review ${batch} ${batch === 1 ? "word" : "words"}`
                    : filteredAllWords.length > 0
                      ? "All caught up"
                      : "No words yet"}
              </h2>
              {/* Each count once: the batch is in the title; the backlog and
                  collection size are here (dueCount is the uncapped backlog). */}
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {loading
                  ? " "
                  : isDueSession
                    ? `${hasMoreQueued ? `${dueCount.toLocaleString()} due · ` : ""}${filteredAllWords.length.toLocaleString()} saved`
                    : filteredAllWords.length > 0
                      ? `Nothing due — practice any of your ${filteredAllWords.length.toLocaleString()} words`
                      : "Add words to start your deck"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row sm:flex-col lg:flex-row">
            {/* One tap goes straight into flashcards — the setup screen
                (mode + category picker) is opt-in via "Customize", not a
                required stop on the way to reviewing. */}
            <Button
              size="lg"
              disabled={loading || deckSize === 0}
              onClick={() => {
                setIsOpen(true)
                startQuiz()
              }}
            >
              <Sparkles aria-hidden="true" />
              {isDueSession ? "Start review" : "Practice"}
            </Button>
            {deckSize > 0 && !loading && (
              <Button size="lg" variant="outline" onClick={() => setIsOpen(true)}>
                Customize
              </Button>
            )}
          </div>
        </div>
      </section>
    )
  }

  // ── idle fullscreen (setup: categories, mode) ──────────────────────────────
  if (phase === "idle" && isOpen) {
    const deckSize = filteredDueToday.length > 0 ? filteredDueToday.length : filteredAllWords.length
    const isDueSession = filteredDueToday.length > 0
    const hasMoreQueued = selectedCategories.size === 0 && dueCount > filteredDueToday.length
    return (
      <LabOverlay title="Memory Lab — set up a review" onClose={() => setIsOpen(false)}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-accent/5 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Memory Lab"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold tracking-tight text-foreground">Memory Lab</p>
            <p className="text-xs font-medium text-muted-foreground leading-tight">
              {isDueSession
                ? hasMoreQueued
                  ? `${filteredDueToday.length} of ${dueCount} due — next batch ready`
                  : `${filteredDueToday.length} ${filteredDueToday.length === 1 ? "word" : "words"} due for review`
                : "Practice the full deck"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-bold text-emerald-600 leading-none">
                {filteredDueToday.length}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                {hasMoreQueued ? "In batch" : "Due"}
              </p>
            </div>
            <div className="h-5 w-px bg-border/60" />
            <div className="text-right">
              <p className="text-base font-bold text-foreground leading-none">
                {filteredAllWords.length}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                Total
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            {/* Category grid */}
            {categories.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Layers3 size={12} strokeWidth={3} />
                  Filter by Category
                  {selectedCategories.size > 0 && (
                    <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                      {selectedCategories.size} selected
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategories(new Set())}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98]",
                    selectedCategories.size === 0
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-accent/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  All Categories
                </button>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((cat) => {
                    const selected = selectedCategories.has(cat)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98]",
                          selected
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-accent/5 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {selected ? (
                          <CheckCircle2 size={13} strokeWidth={3} className="shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current opacity-30" />
                        )}
                        <span className="truncate">{cat}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mode selector */}
            <div className="space-y-2">
              <p
                id="memory-lab-mode-label"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Study Mode
              </p>
              {/* Wraps to rows on phones so five labels don't truncate. */}
              <div
                role="group"
                aria-labelledby="memory-lab-mode-label"
                className="grid grid-cols-3 gap-1 rounded-2xl bg-accent/10 p-1 sm:flex"
              >
                {(
                  [
                    "flashcard",
                    ...(canUseChoice ? (["choice"] as Mode[]) : []),
                    "recall",
                    "listening",
                    "sentence",
                  ] as Mode[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={cn(
                      "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-[0.9rem] px-1 py-3 text-xs font-bold uppercase tracking-wide transition-all",
                      mode === m
                        ? "bg-card text-primary shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "listening" && (
                      <Headphones size={13} strokeWidth={3} className="hidden shrink-0 sm:block" />
                    )}
                    {m === "sentence" && (
                      <Sparkles size={13} strokeWidth={3} className="hidden shrink-0 sm:block" />
                    )}
                    <span className="truncate">
                      {m === "flashcard"
                        ? "Cards"
                        : m === "choice"
                          ? "Quiz"
                          : m === "recall"
                            ? "Recall"
                            : m === "listening"
                              ? "Listen"
                              : "Write"}
                    </span>
                  </button>
                ))}
              </div>
              {mode === "flashcard" && (
                <button
                  type="button"
                  onClick={() => setReversed((r) => !r)}
                  className="mx-auto flex items-center gap-2 rounded-full border border-border bg-accent/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-all hover:bg-accent/20 hover:text-foreground active:scale-95"
                >
                  <ArrowLeftRight size={13} strokeWidth={3} />
                  {reversed ? "English → Korean" : "Korean → English"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Start button */}
        <div className="border-t border-border/60 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            size="lg"
            disabled={loading || deckSize === 0}
            onClick={startQuiz}
            className="mx-auto flex h-14 w-full max-w-2xl text-base"
          >
            <Sparkles aria-hidden="true" />
            {loading
              ? "Loading..."
              : deckSize === 0
                ? "No words yet"
                : isDueSession
                  ? `Review ${filteredDueToday.length} due`
                  : "Practice all words"}
          </Button>
        </div>
      </LabOverlay>
    )
  }

  // ── done ──────────────────────────────────────────────────────────────────
  if (phase === "done") {
    const knew = Math.max(0, total - lapsedIds.size)
    const pct = total > 0 ? Math.round((knew / total) * 100) : 0
    const headline = pct >= 80 ? "Perfect Loop" : pct >= 50 ? "Solid Growth" : "Keep Building"

    const finish = () => {
      setPhase("idle")
      setIsOpen(false)
    }
    return (
      <LabOverlay title="Memory Lab — session results" onClose={finish}>
        {/* Stay immersive coming out of the quiz — back button mirrors the
            session header instead of dropping straight into the page shell. */}
        <div className="flex items-center border-b border-border/60 bg-accent/5 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={finish}
            aria-label="Close Memory Lab"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" size={20} strokeWidth={2.5} />
          </button>
          <span className="ml-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Session Results
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-5 py-10 text-center sm:px-8 sm:py-16">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20">
                <Trophy size={48} strokeWidth={2} />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-4 ring-card"
              >
                <CheckCircle2 size={24} strokeWidth={3} />
              </motion.div>
            </div>

            <div>
              <h2 className="text-4xl font-bold tracking-tight text-foreground">{headline}</h2>
              <p className="mt-3 text-base font-medium text-muted-foreground leading-relaxed">
                You knew <span className="text-emerald-600 font-bold">{knew}</span> of{" "}
                <span className="text-foreground font-bold">{total}</span> words on the first try.
                Keep this momentum up to strengthen long-term memory.
              </p>
            </div>

            {/* Performance Visualization */}
            <div className="relative h-2 w-full max-w-xs overflow-hidden rounded-full bg-accent/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-linear-to-r from-emerald-500 to-teal-400"
              />
            </div>

            {/* Best streak — only meaningful for the test modes that score answers */}
            {(mode === "choice" || mode === "recall") && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: isNewRecord ? 0.9 : 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 0.3,
                  type: isNewRecord ? "spring" : "tween",
                  stiffness: 400,
                  damping: 16,
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-semibold",
                  isNewRecord && bestStreak > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400",
                )}
              >
                <Flame size={18} strokeWidth={2.5} />
                {isNewRecord && bestStreak > 0
                  ? `New personal best! 🎉 ${bestStreak} in a row`
                  : bestStreak > 0
                    ? `Best this session: ${bestStreak} · All-time: ${allTimeBest}`
                    : allTimeBest > 0
                      ? `No streak this time — your record is ${allTimeBest}`
                      : "No streak yet — chain correct answers next time!"}
              </motion.div>
            )}

            {/* With another batch waiting, reviewing it is the primary
                action; otherwise finishing is. */}
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant={filteredDueToday.length > 0 ? "default" : "outline"}
                onClick={startQuiz}
                className="flex-1"
              >
                <RotateCcw aria-hidden="true" />
                {/* Grading a batch refetches the deck (useVocab invalidates once
                    dueWords empties), so by the time this screen renders
                    filteredDueToday is the NEXT batch, not the one just
                    finished — "Re-run" undersold what the button actually does. */}
                {filteredDueToday.length > 0
                  ? `Review ${filteredDueToday.length} more`
                  : "Practice again"}
              </Button>
              <Button
                size="lg"
                variant={filteredDueToday.length > 0 ? "outline" : "default"}
                onClick={finish}
                className="flex-1"
              >
                Finish
              </Button>
            </div>
          </div>
        </div>
      </LabOverlay>
    )
  }

  // ── quiz ──────────────────────────────────────────────────────────────────
  const card = queue[currentIndex]
  if (!card) return null

  // Leaving mid-session asks first once anything's been graded. Every grade is
  // already saved as it happens, so nothing is lost — the dialog only stops an
  // accidental tap from ending the run.
  const requestLeave = () => {
    if (attemptsCount > 0) setConfirmLeave(true)
    else setPhase("idle")
  }

  return (
    <LabOverlay title="Memory Lab — review session" onClose={requestLeave}>
      {/* Announces each answer result and the next card for screen readers. */}
      <p className="sr-only" aria-live="polite">
        {resultNote} Card {Math.min(attemptsCount + 1, total)} of {total}.
      </p>
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this review?</AlertDialogTitle>
            <AlertDialogDescription>
              {attemptsCount} of {total} reviewed. Your grades so far are already saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeave(false)
                setPhase("idle")
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Session Progress Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-accent/5 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
        <button
          type="button"
          onClick={requestLeave}
          className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          aria-label="Leave review"
        >
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-sm font-bold uppercase tracking-wide text-foreground">
            {Math.min(attemptsCount + 1, total)} <span className="opacity-20 mx-1">/</span> {total}
          </span>
          {/* Sync status — reassures the user reviews are persisting (and warns if not) */}
          {(saveError || pendingSaves > 0 || knewCount + lapsedIds.size > 0) && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                saveError
                  ? "text-red-500"
                  : pendingSaves > 0
                    ? "text-muted-foreground"
                    : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {saveError ? (
                <>
                  <XCircle size={12} strokeWidth={3} /> Not saved
                </>
              ) : pendingSaves > 0 ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} strokeWidth={3} /> Synced
                </>
              )}
            </span>
          )}
        </div>
        {/* Live tally: remembered vs. relearning */}
        <div className="flex items-center gap-2.5 text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 aria-hidden="true" size={13} strokeWidth={3} />
            {knewCount}
            <span className="sr-only"> remembered</span>
          </span>
          <span
            className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
            title={
              lapsedIds.size > 0
                ? `${lapsedIds.size} relearning — you'll see ${lapsedIds.size === 1 ? "it" : "them"} again before this session ends`
                : 'Relearning — words graded "Again" come back later in this session'
            }
          >
            <RotateCcw aria-hidden="true" size={13} strokeWidth={3} />
            {lapsedIds.size}
            <span className="sr-only"> relearning — they come back later in this session</span>
          </span>
        </div>
      </div>

      {/* Smooth Progress Indicator */}
      <div className="h-1 w-full bg-accent/10">
        <motion.div
          animate={{ width: `${Math.min((attemptsCount / total) * 100, 100)}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-emerald-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              // Keyed by attempt, not index: a lapsed card can return at the SAME
              // id+index (last card graded "Again"), and without a key change the
              // choice/recall cards keep their answered state and get stuck.
              key={`${card.id}-${attemptsCount}`}
              initial={{ opacity: 0, scale: 0.98, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {mode === "sentence" ? (
                <SentenceCard card={card} onGrade={handleGrade} />
              ) : mode === "listening" ? (
                <ListeningCard card={card} onGrade={handleGrade} />
              ) : mode === "recall" ? (
                <RecallCard
                  card={card}
                  streak={streak}
                  onResult={registerResult}
                  onKnew={() => handleGrade("GOOD")}
                  onLearning={() => handleGrade("AGAIN")}
                />
              ) : mode === "flashcard" || !canUseChoice ? (
                <FlashCard card={card} reversed={reversed} onGrade={handleGrade} />
              ) : (
                <ChoiceCard
                  card={card}
                  allWords={filteredAllWords}
                  streak={streak}
                  onResult={registerResult}
                  onKnew={() => handleGrade("GOOD")}
                  onLearning={() => handleGrade("AGAIN")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LabOverlay>
  )
}
