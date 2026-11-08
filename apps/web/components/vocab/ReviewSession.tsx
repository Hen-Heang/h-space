"use client"

import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  ArrowLeft,
  ArrowLeftRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Eye,
  Flame,
  Gauge,
  Headphones,
  Keyboard,
  Layers3,
  Lightbulb,
  ListChecks,
  Loader2,
  PenLine,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  X,
  XCircle,
  type LucideIcon,
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
  return <p className={cn("font-medium text-muted-foreground", className)}>[{text}]</p>
}

// Shared surfaces for the session's cards. Flat, one border, no 3D press
// edge (docs/design-system.md §5); the prompt card is the quieter variant.
const CARD_FACE = "rounded-xl border border-border bg-card"
const PROMPT_CARD =
  "flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center sm:p-10"
// Sentence-case label above a card's headline.
const CARD_LABEL = "text-sm font-medium text-muted-foreground"
// Large circular speaker inside a card; SpeakButton's own icon is 14px, so
// grow it with the button.
const CARD_SPEAKER =
  "size-12 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary [&_svg]:size-5"
// State text. The `success` token is a fill/border/icon colour: as text it's
// only ≈3.4:1 on white, so success *text* uses the app's AA emerald pair.
const SUCCESS_TEXT = "text-emerald-700 dark:text-emerald-400"
const RELEARN_TEXT = "text-amber-700 dark:text-amber-400"
// The one primary "continue" action at the bottom of a card.
const NEXT_BUTTON = "h-12 w-full text-base"

// Scale a card's headline down as the text gets longer, so long meanings and
// phrases fit the card on a phone instead of overflowing the fixed-height face.
function fitText(text: string | null | undefined, base: string, mid: string, small: string) {
  const len = text?.length ?? 0
  return len > 26 ? small : len > 14 ? mid : base
}

type Mode = "flashcard" | "choice" | "recall" | "listening" | "sentence"
type Phase = "idle" | "quiz" | "done"

// One icon per study mode in the setup picker (shown from `sm`; phones get the
// label alone so five modes fit in two rows).
const MODE_ICONS: Record<Mode, LucideIcon> = {
  flashcard: Layers3,
  choice: ListChecks,
  recall: Keyboard,
  listening: Headphones,
  sentence: PenLine,
}

function ModeIcon({ mode, active }: { mode: Mode; active: boolean }) {
  const Icon = MODE_ICONS[mode]
  return (
    <Icon
      aria-hidden="true"
      className={cn("hidden size-4 shrink-0 sm:block", active && "text-primary")}
    />
  )
}

// Header bar shared by the setup, quiz and results screens.
const LAB_HEADER =
  "flex items-center gap-3 border-b border-border bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4"

function LabBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className="-ml-2 text-muted-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
    </Button>
  )
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
        selected
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

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

// Grade buttons: solid fill from the --grade-* theme tokens (globals.css), the
// label, and the interval the card jumps to.
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
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((rating, index) => (
        <button
          key={rating}
          type="button"
          onClick={() => onGrade(rating)}
          aria-keyshortcuts={showKeys ? String(index + 1) : undefined}
          className={cn(
            "relative flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.97]",
            GRADE_STYLES[rating].classes,
          )}
        >
          <span className="max-w-full truncate text-sm font-semibold">
            {GRADE_STYLES[rating].label}
          </span>
          <span className="max-w-full truncate text-xs font-medium opacity-90">
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
      {/* Flip card */}
      <div className="perspective-[1000px] h-[min(26rem,58dvh)] sm:h-96">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="relative h-full w-full transform-3d"
        >
          {/* Front */}
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className={cn(
              CARD_FACE,
              "absolute inset-0 backface-hidden flex flex-col overflow-y-auto p-6 text-center transition-colors hover:border-primary/30 sm:p-8",
            )}
          >
            {/* m-auto centers when the content fits and keeps it reachable via
                scroll when a long meaning/example makes it taller than the card. */}
            <span className="m-auto flex w-full flex-col items-center">
              <span className={cn(CARD_LABEL, "mb-6")}>{reversed ? "English" : "Korean"}</span>
              <p
                className={cn(
                  "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
              <span className="mt-10 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Eye aria-hidden="true" className="size-4" />
                Tap to reveal
                <kbd
                  aria-hidden="true"
                  className="hidden rounded border border-border px-1.5 font-mono text-xs [@media(pointer:fine)]:inline"
                >
                  Space
                </kbd>
              </span>
            </span>
          </button>

          {/* Back */}
          <div
            className={cn(
              CARD_FACE,
              "absolute inset-0 backface-hidden rotate-y-180 flex flex-col overflow-y-auto border-primary/30 p-6 text-center sm:p-8",
            )}
          >
            <div className="m-auto flex w-full flex-col items-center">
              <span className={cn(CARD_LABEL, "mb-4 text-primary")}>
                {reversed ? "Korean" : "Meaning"}
              </span>
              <p
                className={cn(
                  "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
              <p className="mt-2 break-keep text-lg font-medium text-muted-foreground [overflow-wrap:anywhere] sm:text-2xl">
                <span lang={reversed ? undefined : "ko"}>
                  {reversed ? card.meaning : card.term}
                </span>
              </p>

              {card.example && (
                <div className="app-surface-muted mt-6 w-full max-w-sm p-4 text-sm leading-relaxed text-muted-foreground">
                  {card.example}
                </div>
              )}

              <div className="mt-6 sm:mt-8">
                <SpeakButton text={card.term} className={CARD_SPEAKER} />
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
            {/* AI example sentence — opt-in, quiet until asked for */}
            {hint ? (
              <div className="app-surface-muted flex items-start gap-2.5 p-4">
                <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-foreground">{hint}</p>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchHint}
                disabled={loadingHint}
                className="mx-auto flex text-muted-foreground"
              >
                {loadingHint ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Lightbulb aria-hidden="true" />
                )}
                {loadingHint ? "Creating an example…" : "Get an AI example sentence"}
              </Button>
            )}

            {/* Grading Buttons (Duolingo-style, keys 1-4) */}
            <GradeButtons card={card} onGrade={grade} showKeys />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Correct-answer reaction ─────────────────────────────────────────────────
// A short reaction shown the instant a test answer is right. The combo
// (consecutive correct answers this session) escalates the praise — and swaps
// the check for a flame from three in a row — so a hot streak still feels
// rewarding without an emoji burst.
const PRAISE = ["Nice!", "잘했어요!", "Perfect!", "You got it!", "Excellent!", "Spot on!"]

function praiseFor(combo: number): string {
  if (combo >= 10) return "Unstoppable!"
  if (combo >= 5) return "On fire!"
  if (combo >= 3) return `${combo} in a row!`
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
  const Icon = combo >= 3 ? Flame : CheckCircle2
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl bg-success/10 px-5 py-3",
        SUCCESS_TEXT,
      )}
    >
      <motion.span
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.05 }}
        className="flex"
      >
        <Icon aria-hidden="true" className="size-5" />
      </motion.span>
      <span className="text-base font-semibold">{message}</span>
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

  const pick = useCallback(
    (id: string) => {
      if (answered) return
      setSelected(id)
      const correct = id === card.id
      onResult(correct)
      if (correct) buzz()
    },
    [answered, card.id, onResult],
  )

  const next = useCallback(
    () => (selected === card.id ? onKnew() : onLearning()),
    [selected, card.id, onKnew, onLearning],
  )

  // Keys: 1-4 pick an option (matching the numbers on each row), then Enter
  // moves on — the same 1-4 rhythm FlashCard uses for grading.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= choices.length) {
        e.preventDefault()
        pick(choices[n - 1].id)
      } else if (answered && e.key === "Enter") {
        // A focused button (e.g. "Next word") already activates on Enter;
        // handling it here too would advance — and grade — twice.
        if (e.target instanceof HTMLButtonElement) return
        e.preventDefault()
        void next()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [answered, choices, pick, next])

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt Card */}
      <div className={PROMPT_CARD}>
        <span className={cn(CARD_LABEL, "mb-4")}>Choose the meaning</span>
        <p
          className={cn(
            "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
          <SpeakButton text={card.term} className={CARD_SPEAKER} />
        </div>
      </div>

      {/* Choices List */}
      <div className="grid gap-2.5">
        {choices.map((choice, i) => {
          const isCorrect = choice.id === card.id
          const isSelected = choice.id === selected

          return (
            <motion.button
              key={choice.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
              type="button"
              onClick={() => pick(choice.id)}
              disabled={answered}
              aria-keyshortcuts={String(i + 1)}
              className={cn(
                "group flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4",
                !answered
                  ? "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] active:bg-primary/[0.06]"
                  : isCorrect
                    ? "border-success bg-success/10"
                    : isSelected
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-card opacity-50",
              )}
            >
              {/* Option number — keeps the four rows scannable */}
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
                  !answered
                    ? "border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
                    : isCorrect
                      ? "border-success bg-success text-white"
                      : isSelected
                        ? "border-destructive bg-destructive text-white"
                        : "border-border text-muted-foreground",
                )}
              >
                {answered && isCorrect ? (
                  <Check className="size-4" />
                ) : answered && isSelected ? (
                  <X className="size-4" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-base font-medium [overflow-wrap:anywhere] sm:text-lg",
                  !answered
                    ? "text-foreground"
                    : isCorrect
                      ? SUCCESS_TEXT
                      : isSelected
                        ? "text-destructive"
                        : "text-muted-foreground",
                )}
              >
                {choice.meaning}
              </span>
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
            <Button size="lg" onClick={() => void next()} className={NEXT_BUTTON}>
              Next word
              <ChevronRight aria-hidden="true" />
            </Button>
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
      <div className={PROMPT_CARD}>
        <span className={cn(CARD_LABEL, "mb-4")}>Type it in Korean</span>
        <p
          className={cn(
            "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
          <Pronunciation text={card.pronunciation} className="mt-3 text-base" />
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
          aria-label="Your answer in Korean"
          className={cn(
            "h-14 w-full rounded-xl border bg-card px-5 text-center text-xl font-semibold tracking-tight text-foreground outline-none transition-[color,border-color,box-shadow] placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground",
            !answered
              ? "border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              : result === "correct"
                ? cn("border-success bg-success/10", SUCCESS_TEXT)
                : "border-destructive bg-destructive/10 text-destructive",
          )}
        />

        {!answered && (
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <Button size="lg" onClick={submit} disabled={!answer.trim()} className="h-12 text-base">
              <Check aria-hidden="true" />
              Check
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setResult("incorrect")
                onResult(false)
              }}
              className="h-12"
            >
              <Eye aria-hidden="true" />
              Show
            </Button>
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
            <div className={cn(CARD_FACE, "flex items-center justify-between gap-3 p-4")}>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    result === "correct" ? SUCCESS_TEXT : "text-muted-foreground",
                  )}
                >
                  {result === "correct" ? "Correct" : "Answer"}
                </p>
                <p className="mt-1 break-keep text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]">
                  <span lang="ko">{card.term}</span>
                </p>
                {card.example && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {card.example}
                  </p>
                )}
              </div>
              <SpeakButton text={card.term} className={cn(CARD_SPEAKER, "shrink-0")} />
            </div>

            <Button size="lg" onClick={next} className={NEXT_BUTTON}>
              Next word
              <ChevronRight aria-hidden="true" />
            </Button>
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
      <div
        className={cn(
          CARD_FACE,
          "flex h-[min(26rem,58dvh)] flex-col items-center justify-center gap-6 p-6 text-center sm:h-96 sm:p-8",
        )}
      >
        <span className={CARD_LABEL}>Listen and recall the meaning</span>

        {/* Big play button — a soft ring pulses while audio plays */}
        <button
          type="button"
          onClick={() => void play()}
          disabled={loadingAudio}
          aria-label="Play audio"
          className={cn(
            "flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[transform,box-shadow] hover:bg-primary/90 active:scale-95 disabled:opacity-60 sm:size-28",
            playing && "ring-8 ring-primary/15",
          )}
        >
          {loadingAudio ? (
            <Loader2 aria-hidden="true" className="size-10 animate-spin" />
          ) : (
            <Volume2 aria-hidden="true" className="size-10" />
          )}
        </button>

        <Button variant="outline" size="sm" onClick={() => void play(0.7)} className="rounded-full">
          <Gauge aria-hidden="true" /> Slow
        </Button>

        {audioFailed && (
          <p className="text-sm text-muted-foreground">Tap the speaker to play the audio.</p>
        )}
      </div>

      {!revealed ? (
        <Button
          size="lg"
          variant="outline"
          onClick={() => setRevealed(true)}
          className={NEXT_BUTTON}
        >
          <Eye aria-hidden="true" /> Show answer
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Answer reveal */}
          <div className={cn(CARD_FACE, "border-primary/30 p-5 text-center")}>
            <p
              className={cn(
                "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
            <p className="mt-3 break-keep text-xl font-medium text-foreground [overflow-wrap:anywhere] sm:text-2xl">
              {card.meaning}
            </p>
            {card.example && (
              <p className="app-surface-muted mx-auto mt-4 max-w-sm p-3 text-sm leading-relaxed text-muted-foreground">
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
      ? SUCCESS_TEXT
      : result.score >= 60
        ? RELEARN_TEXT
        : "text-destructive"

  const scoreBg = !result
    ? ""
    : result.score >= 80
      ? "bg-success/10"
      : result.score >= 60
        ? "bg-amber-500/10"
        : "bg-destructive/10"

  return (
    <div className="flex flex-col gap-5">
      {/* Prompt card */}
      <div className={PROMPT_CARD}>
        <span className={cn(CARD_LABEL, "mb-4")}>Write a sentence</span>
        <p
          className={cn(
            "w-full break-keep font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
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
        <p className="mt-2 break-keep text-lg font-medium text-muted-foreground [overflow-wrap:anywhere]">
          {card.meaning}
        </p>
        <div className="mt-5">
          <SpeakButton text={card.term} className={CARD_SPEAKER} />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {phase === "loading" && (
        <div className="app-surface-muted flex items-center gap-2.5 px-4 py-4">
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Building your challenge…</span>
        </div>
      )}

      {/* Challenge failed to load — offer a retry, and let the learner still
          self-grade the card so the session can't dead-end here. */}
      {phase === "writing" && !challenge && (
        <div className="space-y-3">
          <Button variant="outline" size="lg" onClick={retryChallenge} className="h-12 w-full">
            <RotateCcw aria-hidden="true" /> Retry challenge
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Or rate this word yourself and continue
          </p>
          <GradeButtons card={card} onGrade={advanceCard} />
        </div>
      )}

      {(phase === "writing" || phase === "checking") && challenge && (
        <div className="space-y-3">
          <div className="app-surface-muted space-y-1.5 p-4">
            <span className="text-sm font-medium text-primary">Task</span>
            <p className="text-base leading-relaxed text-foreground">{challenge.challengePrompt}</p>
            {challenge.contextHint && (
              <p className="text-sm text-muted-foreground">{challenge.contextHint}</p>
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
            aria-label={`Your Korean sentence using ${card.term}`}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
          />

          <Button
            size="lg"
            onClick={handleCheck}
            disabled={!attempt.trim() || phase === "checking"}
            className={NEXT_BUTTON}
          >
            {phase === "checking" ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" /> Evaluating…
              </>
            ) : (
              <>
                <Check aria-hidden="true" /> Check my sentence
              </>
            )}
          </Button>
        </div>
      )}

      {phase === "result" && result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Score */}
          <div className={cn("flex items-center gap-4 rounded-xl p-4", scoreBg)}>
            <div className={cn("text-4xl font-semibold tabular-nums", scoreColor)}>
              {result.score}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", scoreColor)}>
                {result.correct ? "Good job" : "Keep practicing"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{result.feedback}</p>
            </div>
          </div>

          {/* Corrections — told apart by their labels, not by colour */}
          {result.correctedSentence && result.correctedSentence !== attempt.trim() && (
            <div className={cn(CARD_FACE, "space-y-1 p-3")}>
              <span className="text-sm font-medium text-muted-foreground">Corrected</span>
              <p lang="ko" className="text-base font-medium text-foreground">
                {result.correctedSentence}
              </p>
            </div>
          )}

          {result.betterAlternative && (
            <div className={cn(CARD_FACE, "space-y-1 p-3")}>
              <span className="text-sm font-medium text-muted-foreground">More natural</span>
              <p lang="ko" className="text-base font-medium text-foreground">
                {result.betterAlternative}
              </p>
            </div>
          )}

          {result.grammarNote && (
            <div className="app-surface-muted flex items-start gap-2 p-3">
              <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">{result.grammarNote}</p>
            </div>
          )}

          {/* Grade buttons — score drives the recommendation, learner confirms */}
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">How well did you do?</p>
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
        className={cn("app-surface p-5 sm:p-6", isDueSession && "border-primary/30")}
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
        <div className={LAB_HEADER}>
          <LabBackButton label="Close Memory Lab" onClick={() => setIsOpen(false)} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-tight text-foreground">Memory Lab</p>
            <p className="text-sm leading-tight text-muted-foreground">
              {isDueSession
                ? hasMoreQueued
                  ? `${filteredDueToday.length} of ${dueCount} due — next batch ready`
                  : `${filteredDueToday.length} ${filteredDueToday.length === 1 ? "word" : "words"} due for review`
                : "Practice the full deck"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-semibold leading-none text-primary tabular-nums">
                {filteredDueToday.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasMoreQueued ? "In batch" : "Due"}
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-right">
              <p className="text-base font-semibold leading-none text-foreground tabular-nums">
                {filteredAllWords.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            {/* Category grid */}
            {categories.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers3 aria-hidden="true" className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Categories</h3>
                  {selectedCategories.size > 0 && (
                    <span className="ml-auto text-sm text-primary">
                      {selectedCategories.size} selected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <CategoryChip
                    label="All categories"
                    selected={selectedCategories.size === 0}
                    onClick={() => setSelectedCategories(new Set())}
                  />
                  {categories.map((cat) => (
                    <CategoryChip
                      key={cat}
                      label={cat}
                      selected={selectedCategories.has(cat)}
                      onClick={() => toggleCategory(cat)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mode selector */}
            <div className="space-y-3">
              <h3 id="memory-lab-mode-label" className="text-sm font-semibold text-foreground">
                Study mode
              </h3>
              {/* Wraps to rows on phones so five labels don't truncate. */}
              <div
                role="group"
                aria-labelledby="memory-lab-mode-label"
                className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:flex"
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
                      "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 py-2.5 text-sm font-medium transition-colors",
                      mode === m
                        ? "bg-card text-foreground ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ModeIcon mode={m} active={mode === m} />
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReversed((r) => !r)}
                  className="mx-auto flex rounded-full"
                >
                  <ArrowLeftRight aria-hidden="true" />
                  {reversed ? "English → Korean" : "Korean → English"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Start button */}
        <div className="border-t border-border px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            size="lg"
            disabled={loading || deckSize === 0}
            onClick={startQuiz}
            className="mx-auto flex h-12 w-full max-w-2xl text-base"
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
        <div className={LAB_HEADER}>
          <LabBackButton label="Close Memory Lab" onClick={finish} />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Session results
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 py-10 text-center sm:py-16">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Trophy aria-hidden="true" className="size-10" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{headline}</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                You knew <span className="font-semibold text-foreground">{knew}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> words on the first
                try. Keep this momentum up to strengthen long-term memory.
              </p>
            </div>

            {/* Score: first-try accuracy */}
            <div className="w-full max-w-xs">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">First-try accuracy</span>
                <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="First-try accuracy"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
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
                  "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium",
                  isNewRecord && bestStreak > 0
                    ? cn("bg-success/10", SUCCESS_TEXT)
                    : "bg-muted text-foreground",
                )}
              >
                <Flame
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0",
                    !(isNewRecord && bestStreak > 0) && "text-amber-600 dark:text-amber-400",
                  )}
                />
                {isNewRecord && bestStreak > 0
                  ? `New personal best — ${bestStreak} in a row`
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
                className="sm:flex-1"
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
                className="sm:flex-1"
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
      <div className={cn(LAB_HEADER, "justify-between")}>
        <LabBackButton label="Leave review" onClick={requestLeave} />
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {Math.min(attemptsCount + 1, total)}
            <span className="mx-1 text-muted-foreground">/</span>
            {total}
          </span>
          {/* Sync status — reassures the user reviews are persisting (and warns if not) */}
          {(saveError || pendingSaves > 0 || knewCount + lapsedIds.size > 0) && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                saveError ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              {saveError ? (
                <>
                  <XCircle aria-hidden="true" className="size-3.5" /> Not saved
                </>
              ) : pendingSaves > 0 ? (
                <>
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Cloud aria-hidden="true" className="size-3.5" /> Synced
                </>
              )}
            </span>
          )}
        </div>
        {/* Live tally: remembered vs. relearning */}
        <div className="flex items-center gap-3 text-sm font-medium tabular-nums">
          <span className={cn("flex items-center gap-1", SUCCESS_TEXT)}>
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {knewCount}
            <span className="sr-only"> remembered</span>
          </span>
          <span
            className={cn("flex items-center gap-1", RELEARN_TEXT)}
            title={
              lapsedIds.size > 0
                ? `${lapsedIds.size} relearning — you'll see ${lapsedIds.size === 1 ? "it" : "them"} again before this session ends`
                : 'Relearning — words graded "Again" come back later in this session'
            }
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {lapsedIds.size}
            <span className="sr-only"> relearning — they come back later in this session</span>
          </span>
        </div>
      </div>

      {/* Session progress */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          animate={{ width: `${Math.min((attemptsCount / total) * 100, 100)}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full rounded-r-full bg-primary"
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
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
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
