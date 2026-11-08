"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useSyncExternalStore } from "react"
import {
  ArrowLeft,
  BookmarkPlus,
  BookOpenText,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { useLanguageAids } from "@/components/learn/LanguageAids"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { SmartPeek } from "@/components/ui/SmartPeek"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { getApiErrorMessage, readingApi, vocabApi } from "@/lib/api"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { READING_CATEGORIES, type ReadingUnit } from "@/lib/reading"
import {
  getReadingProgress,
  getReadingProgressServerSnapshot,
  markUnitCompleted,
  markUnitQuizResult,
  markUnitStarted,
  subscribeReadingProgress,
} from "@/lib/reading-progress-store"
import { deleteReadingUnit } from "@/lib/reading-store"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
} as const

// Quiz options mix Korean and English; mark only the Korean ones.
const hasHangul = (text: string) => /[ᄀ-ᇿ㄰-㆏가-힯]/.test(text)

/** Splits Korean text into words so each one becomes tappable via SmartPeek. */
function PeekableText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((token, i) => {
        if (/^\s+$/.test(token) || token === "") return token
        const word = token.replace(/[.,!?~"'“”‘’()[\]…:;]/g, "")
        if (!word) return token
        return (
          <SmartPeek key={i} word={word}>
            {token}
          </SmartPeek>
        )
      })}
    </>
  )
}

export default function ReadingUnitPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  // On a hard page load, Next's client useParams() returns the raw
  // (still percent-encoded) segment for non-ASCII ids — decode it once here so
  // the Supabase query builder doesn't encode it a second time and look up a
  // literal "%EC%9A%B4..." string that matches no row. A no-op for ids that
  // arrive already-decoded (soft nav) since they contain no "%".
  const unitId = decodeURIComponent(params.id)

  const [unit, setUnit] = useState<ReadingUnit | null>(null)
  const [loadingUnit, setLoadingUnit] = useState(true)
  const { logActivity } = useLogActivity("reading")
  useSessionTimer("reading")

  useEffect(() => {
    let active = true
    readingApi
      .getUnit(unitId)
      .then((u) => active && setUnit(u))
      .catch(() => active && setUnit(null))
      .finally(() => active && setLoadingUnit(false))
    return () => {
      active = false
    }
  }, [unitId])

  const progressMap = useSyncExternalStore(
    subscribeReadingProgress,
    getReadingProgress,
    getReadingProgressServerSnapshot,
  )
  const progress = (unit && progressMap[unit.id]) || { status: "not_started" as const }

  const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set())
  // "Show all translations" is remembered per viewer (off by default, as
  // before); single paragraphs can still be revealed on their own.
  const { showEnglish: allTranslations, toggle: toggleAids } = useLanguageAids("reading-unit", {
    romanization: false,
    english: false,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [savedWords, setSavedWords] = useState<Set<string>>(new Set())
  const [savingWord, setSavingWord] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [vocabMessage, setVocabMessage] = useState("")

  const [savedSentences, setSavedSentences] = useState<Set<number>>(new Set())
  const [savingSentence, setSavingSentence] = useState<number | null>(null)

  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!unit) return
    void markUnitStarted(unit.id)
  }, [unit])

  if (loadingUnit) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm font-bold">Loading unit…</span>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-lg font-bold text-foreground">Unit not found.</p>
        <Link
          href="/phrasebook?mode=reading"
          className="text-sm font-bold text-emerald-600 hover:underline"
        >
          Back to Reading Units
        </Link>
      </div>
    )
  }

  function toggleTranslation(index: number) {
    setVisibleTranslations((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  async function handleSaveWord(term: string, meaning: string, example?: string) {
    if (savedWords.has(term) || savingWord) return
    setSavingWord(term)
    setVocabMessage("")
    try {
      await vocabApi.save({ term, meaning, example, category: "Reading" })
      setSavedWords((prev) => new Set(prev).add(term))
    } catch (err) {
      setVocabMessage(getApiErrorMessage(err, "Could not save this word."))
    } finally {
      setSavingWord(null)
    }
  }

  // Saves a whole paragraph (not a single word) into its own "Saved Sentences"
  // deck on the Vocab page — sentence mining, distinct from the word-by-word
  // flashcard category above.
  async function handleSaveSentence(index: number, korean: string, english: string) {
    if (savedSentences.has(index) || savingSentence !== null) return
    setSavingSentence(index)
    try {
      await vocabApi.save({ term: korean, meaning: english, category: "Saved Sentences" })
      setSavedSentences((prev) => new Set(prev).add(index))
      toast.success("Sentence saved to your Vocab deck.")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save this sentence."))
    } finally {
      setSavingSentence(null)
    }
  }

  async function handleSaveAll() {
    if (savingAll || !unit) return
    setSavingAll(true)
    setVocabMessage("")
    const next = new Set(savedWords)
    try {
      for (const v of unit.vocab) {
        if (next.has(v.term)) continue
        await vocabApi.save({
          term: v.term,
          meaning: v.meaning,
          example: v.example,
          category: "Reading",
        })
        next.add(v.term)
        setSavedWords(new Set(next))
      }
      setVocabMessage(
        "All words added to your flashcards — they will appear in your vocab reviews.",
      )
    } catch (err) {
      setVocabMessage(getApiErrorMessage(err, "Could not save all words."))
    } finally {
      setSavingAll(false)
    }
  }

  function handleSubmitQuiz() {
    if (!unit) return
    const correct = unit.quiz.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0)
    setScore(correct)
    setSubmitted(true)
    void markUnitQuizResult(unit.id, correct, unit.quiz.length)
  }

  function handleRetryQuiz() {
    setAnswers({})
    setSubmitted(false)
    setScore(0)
  }

  async function handleDelete() {
    if (!unit) return
    setConfirmDelete(false)
    try {
      await deleteReadingUnit(unit.id)
      toast.success("Unit deleted.")
      router.push("/phrasebook?mode=reading")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete this unit."))
    }
  }

  const allAnswered = Object.keys(answers).length === unit.quiz.length
  const passed = submitted && score >= Math.ceil(unit.quiz.length * 0.6)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-12"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Link
          href="/phrasebook?mode=reading"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> All units
        </Link>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl dark:bg-slate-900/40 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                {READING_CATEGORIES[unit.category].label}
              </span>
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {unit.level}
              </span>
              {progress.status === "completed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                  <CheckCircle2 size={11} /> Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/reading/${unit.id}/edit`}
                title="Edit unit"
                aria-label="Edit unit"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition-all after:absolute after:-inset-1 after:content-[''] hover:text-foreground active:scale-95"
              >
                <Pencil aria-hidden="true" size={15} />
              </Link>
              <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    title="Delete unit"
                    aria-label="Delete unit"
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition-all after:absolute after:-inset-1 after:content-[''] hover:border-destructive/30 hover:text-destructive active:scale-95"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this unit?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{unit.title}” and its progress will be removed. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void handleDelete()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <h2
              lang="ko"
              className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {unit.episode ? `${unit.episode} · ` : ""}
              {unit.title}
            </h2>
            <SpeakButton text={unit.title} className="shrink-0" />
          </div>
          <p className="mt-1 text-base font-bold text-muted-foreground">{unit.titleEnglish}</p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/80">
            {unit.summary}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">
            Source: {unit.source}
          </p>
        </div>
      </motion.div>

      {/* ── Grammar note ── */}
      {unit.grammarNote && (
        <motion.div
          variants={itemVariants}
          className="rounded-[1.8rem] border border-sky-200/60 bg-sky-50/60 p-5 dark:border-sky-400/15 dark:bg-sky-400/6"
        >
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <GraduationCap size={16} />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Grammar focus</span>
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{unit.grammarNote.pattern}</p>
          <p className="mt-1.5 text-sm leading-6 text-sky-800 dark:text-sky-200">
            {unit.grammarNote.explanation}
          </p>
        </motion.div>
      )}

      {/* ── Reading section ── */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BookOpenText size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold tracking-tight text-foreground">Read</h3>
          </div>
          <button
            type="button"
            onClick={() => toggleAids("english")}
            aria-pressed={allTranslations}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            {allTranslations ? <EyeOff size={13} /> : <Eye size={13} />}
            {allTranslations ? "Hide all translations" : "Show all translations"}
          </button>
        </div>
        {/* Shown on phones too — that's where tap-to-look-up matters most. */}
        <p className="px-1 text-xs text-muted-foreground">
          Tap any word to look it up · tap the speaker to listen
        </p>

        <div className="space-y-3">
          {unit.paragraphs.map((p, i) => {
            const showTranslation = allTranslations || visibleTranslations.has(i)
            return (
              <div
                key={i}
                className="rounded-[1.8rem] border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  {/* Numbered point — gives each paragraph a stable reference
                      ("point 3") so notes taken while reading are easy to find
                      again, and shows position in the passage (4 of 7). */}
                  <span
                    aria-label={`Point ${i + 1}`}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-bold tabular-nums text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400"
                  >
                    {i + 1}
                  </span>
                  <p
                    lang="ko"
                    className="min-w-0 max-w-[38em] flex-1 break-keep text-[1.0625rem] font-medium leading-8 text-foreground [overflow-wrap:anywhere] sm:text-lg sm:leading-9"
                  >
                    <PeekableText text={p.korean} />
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSaveSentence(i, p.korean, p.english)}
                    disabled={savedSentences.has(i) || savingSentence === i}
                    title={
                      savedSentences.has(i)
                        ? "Saved to your Vocab deck"
                        : "Save this sentence to your Vocab deck"
                    }
                    aria-label={
                      savedSentences.has(i)
                        ? `Paragraph ${i + 1} saved to your Vocab deck`
                        : `Save paragraph ${i + 1} to your Vocab deck`
                    }
                    className={cn(
                      "relative mt-1 shrink-0 rounded-xl p-1.5 transition-all after:absolute after:-inset-2 after:content-[''] active:scale-90",
                      savedSentences.has(i)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {savingSentence === i ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : savedSentences.has(i) ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <BookmarkPlus size={16} />
                    )}
                  </button>
                  <SpeakButton text={p.korean} className="mt-1 shrink-0" />
                </div>

                <div className="mt-3 border-t border-border/60 pt-3 sm:pl-10">
                  <button
                    type="button"
                    onClick={() => toggleTranslation(i)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {showTranslation ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showTranslation ? "Hide translation" : "Show translation"}
                  </button>
                  {showTranslation && (
                    <p className="mt-2 break-words text-sm font-medium leading-relaxed text-muted-foreground">
                      {p.english}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.section>

      {/* ── Vocabulary section ── */}
      {unit.vocab.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <BookmarkPlus size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Key Vocabulary{" "}
                <span className="text-muted-foreground/50">({unit.vocab.length})</span>
              </h3>
            </div>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll || savedWords.size === unit.vocab.length}
              className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 active:scale-95"
            >
              {savingAll ? (
                <Loader2 size={13} className="mr-1.5 animate-spin" />
              ) : (
                <BookmarkPlus size={13} className="mr-1.5" />
              )}
              {savedWords.size === unit.vocab.length ? "All saved" : "Save all to flashcards"}
            </Button>
          </div>

          {vocabMessage && (
            <p className="px-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {vocabMessage}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {unit.vocab.map((v, vi) => {
              const saved = savedWords.has(v.term)
              return (
                <div
                  key={v.term}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 dark:bg-white/4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {/* Numbered so a word is referenceable ("vocab 5"), matching
                        the reading points and quiz numbering. */}
                      <span
                        aria-label={`Word ${vi + 1}`}
                        className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-emerald-500/10 px-1 text-xs font-bold tabular-nums text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400"
                      >
                        {vi + 1}
                      </span>
                      <p lang="ko" className="font-bold text-foreground">
                        {v.term}
                      </p>
                      <SpeakButton text={v.term} />
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-muted-foreground">{v.meaning}</p>
                    {v.example && (
                      <p className="mt-1 text-xs font-medium italic text-muted-foreground/60">
                        {v.example}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveWord(v.term, v.meaning, v.example)}
                    disabled={saved || savingWord === v.term}
                    title={saved ? "Saved to flashcards" : "Save to flashcards"}
                    aria-label={
                      saved ? `${v.term} saved to flashcards` : `Save ${v.term} to flashcards`
                    }
                    className={cn(
                      "mt-1 shrink-0 rounded-xl border p-2 transition-all active:scale-90",
                      saved
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {savingWord === v.term ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : saved ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <BookmarkPlus size={14} />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ── Quiz section ── */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold tracking-tight text-foreground">Comprehension Quiz</h3>
          <span className="text-xs font-bold text-muted-foreground/60">
            {unit.quiz.length > 0 ? "Pass to complete the unit" : "No quiz in this unit"}
          </span>
        </div>

        {unit.quiz.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[1.8rem] border border-border bg-card p-5 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              This unit has no quiz — mark it as completed once you have finished reading. You can
              add questions any time with the edit button above.
            </p>
            {progress.status === "completed" ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Completed
              </span>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  void markUnitCompleted(unit.id)
                  void logActivity()
                }}
                className="h-10 shrink-0 rounded-xl bg-emerald-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 active:scale-95"
              >
                <CheckCircle2 size={14} className="mr-1.5" />
                Mark as completed
              </Button>
            )}
          </div>
        ) : (
          <>
            {submitted && (
              <div
                role="status"
                className={cn(
                  "flex items-center justify-between rounded-[1.8rem] border p-5",
                  passed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
              >
                <div className="flex items-center gap-3">
                  {passed ? (
                    <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <RotateCcw size={24} className="text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {score}/{unit.quiz.length} correct
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {passed
                        ? "Unit completed! The vocabulary you saved will come back in your reviews."
                        : "Almost there — re-read the text above and try again."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleRetryQuiz}
                  className="h-9 rounded-xl border border-border bg-background px-4 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-accent active:scale-95"
                >
                  <RotateCcw size={13} className="mr-1.5" /> Retry
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {unit.quiz.map((q, qi) => {
                const selected = answers[qi]
                return (
                  <div
                    key={qi}
                    className="rounded-[1.8rem] border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40"
                  >
                    <p className="font-bold text-foreground">
                      <span className="mr-2 text-muted-foreground/50">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = selected === oi
                        const isCorrect = submitted && oi === q.answerIndex
                        const isWrongPick = submitted && isSelected && oi !== q.answerIndex
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={submitted}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-bold transition-all active:scale-[0.98]",
                              isCorrect
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : isWrongPick
                                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                                  : isSelected
                                    ? "border-emerald-500/50 bg-emerald-500/5 text-foreground"
                                    : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                            )}
                          >
                            <span lang={hasHangul(opt) ? "ko" : undefined}>{opt}</span>
                            {isCorrect && <CheckCircle2 size={15} className="shrink-0" />}
                            {isWrongPick && <XCircle size={15} className="shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/50 p-3 text-xs font-medium leading-relaxed text-muted-foreground">
                        <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!submitted && (
              <Button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={!allAnswered}
                className="h-11 w-full rounded-2xl bg-emerald-600 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-500 active:scale-[0.99] sm:w-auto sm:px-8"
              >
                {allAnswered
                  ? "Submit answers"
                  : `Answer all questions (${Object.keys(answers).length}/${unit.quiz.length})`}
              </Button>
            )}
          </>
        )}
      </motion.section>
    </motion.div>
  )
}
