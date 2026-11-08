"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useSyncExternalStore } from "react"
import {
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
  SearchX,
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
import { BackLink } from "@/components/ui/back-link"
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
import { EmptyState } from "@/components/ui/empty-state"
import { ReaderSkeleton } from "@/components/ui/reader-skeleton"

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
    return <ReaderSkeleton label="Loading unit…" />
  }

  if (!unit) {
    return (
      <EmptyState
        className="py-24"
        icon={SearchX}
        title="Unit not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild variant="outline">
            <Link href="/phrasebook?mode=reading">Back to reading units</Link>
          </Button>
        }
      />
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
        {/* Phones get MobileHeader's back button, so this is desktop-only. */}
        <BackLink href="/phrasebook?mode=reading" label="All units" desktopOnly />

        <div className="app-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {READING_CATEGORIES[unit.category].label}
              </span>
              <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {unit.level}
              </span>
              {progress.status === "completed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 aria-hidden="true" size={12} /> Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground">
                <Link href={`/reading/${unit.id}/edit`} title="Edit unit" aria-label="Edit unit">
                  <Pencil aria-hidden="true" />
                </Link>
              </Button>
              <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Delete unit"
                    aria-label="Delete unit"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
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
              className="min-w-0 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              {unit.episode ? `${unit.episode} · ` : ""}
              {unit.title}
            </h2>
            <SpeakButton text={unit.title} className="shrink-0" />
          </div>
          <p className="mt-1 text-base font-medium text-muted-foreground">{unit.titleEnglish}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {unit.summary}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Source: {unit.source}</p>
        </div>
      </motion.div>

      {/* ── Grammar note ── */}
      {unit.grammarNote && (
        <motion.div variants={itemVariants} className="app-surface-muted p-5">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap aria-hidden="true" size={16} />
            <span className="text-sm font-medium">Grammar focus</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">{unit.grammarNote.pattern}</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {unit.grammarNote.explanation}
          </p>
        </motion.div>
      )}

      {/* ── Reading section ── */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpenText aria-hidden="true" size={18} className="text-muted-foreground" />
            <h3 className="text-section-heading font-semibold text-foreground">Read</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleAids("english")}
            aria-pressed={allTranslations}
            className="text-primary hover:text-primary"
          >
            {allTranslations ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {allTranslations ? "Hide all translations" : "Show all translations"}
          </Button>
        </div>
        {/* Shown on phones too — that's where tap-to-look-up matters most. */}
        <p className="text-sm text-muted-foreground">
          Tap any word to look it up · tap the speaker to listen
        </p>

        {/* One surface, one divided row per paragraph (design-system §5). */}
        <div className="app-surface divide-y divide-border">
          {unit.paragraphs.map((p, i) => {
            const showTranslation = allTranslations || visibleTranslations.has(i)
            return (
              <div key={i} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {/* Numbered point — gives each paragraph a stable reference
                      ("point 3") so notes taken while reading are easy to find
                      again, and shows position in the passage (4 of 7). */}
                  <span
                    aria-label={`Point ${i + 1}`}
                    className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground"
                  >
                    {i + 1}
                  </span>
                  <p
                    lang="ko"
                    className="min-w-0 max-w-[38em] flex-1 break-keep text-[1.0625rem] leading-8 text-foreground [overflow-wrap:anywhere] sm:text-lg sm:leading-9"
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
                      "relative mt-1 shrink-0 rounded-md p-1.5 transition-colors after:absolute after:-inset-2 after:content-['']",
                      savedSentences.has(i)
                        ? "text-success"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {savingSentence === i ? (
                      <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                    ) : savedSentences.has(i) ? (
                      <CheckCircle2 aria-hidden="true" size={16} />
                    ) : (
                      <BookmarkPlus aria-hidden="true" size={16} />
                    )}
                  </button>
                  <SpeakButton text={p.korean} className="mt-1 shrink-0" />
                </div>

                <div className="mt-2 sm:pl-10">
                  <button
                    type="button"
                    onClick={() => toggleTranslation(i)}
                    aria-expanded={showTranslation}
                    className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showTranslation ? (
                      <EyeOff aria-hidden="true" size={14} />
                    ) : (
                      <Eye aria-hidden="true" size={14} />
                    )}
                    {showTranslation ? "Hide translation" : "Show translation"}
                  </button>
                  {showTranslation && (
                    <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookmarkPlus aria-hidden="true" size={18} className="text-muted-foreground" />
              <h3 className="text-section-heading font-semibold text-foreground">
                Key vocabulary{" "}
                <span className="font-normal text-muted-foreground">({unit.vocab.length})</span>
              </h3>
            </div>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={savingAll || savedWords.size === unit.vocab.length}
            >
              {savingAll ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <BookmarkPlus aria-hidden="true" />
              )}
              {savedWords.size === unit.vocab.length ? "All saved" : "Save all to flashcards"}
            </Button>
          </div>

          {/* Neutral on purpose: the same line also carries save errors. */}
          {vocabMessage && (
            <p role="status" className="text-sm text-muted-foreground">
              {vocabMessage}
            </p>
          )}

          <div className="app-surface divide-y divide-border">
            {unit.vocab.map((v, vi) => {
              const saved = savedWords.has(v.term)
              return (
                <div key={v.term} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {/* Numbered so a word is referenceable ("vocab 5"), matching
                        the reading points and quiz numbering. */}
                      <span
                        aria-label={`Word ${vi + 1}`}
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs font-medium tabular-nums text-muted-foreground"
                      >
                        {vi + 1}
                      </span>
                      <p lang="ko" className="font-semibold text-foreground">
                        {v.term}
                      </p>
                      <SpeakButton text={v.term} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.meaning}</p>
                    {v.example && (
                      <p lang="ko" className="mt-1 text-sm text-muted-foreground">
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
                      "relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors after:absolute after:-inset-1 after:content-['']",
                      saved
                        ? "text-success"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {savingWord === v.term ? (
                      <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                    ) : saved ? (
                      <CheckCircle2 aria-hidden="true" size={16} />
                    ) : (
                      <BookmarkPlus aria-hidden="true" size={16} />
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
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap aria-hidden="true" size={18} className="text-muted-foreground" />
            <h3 className="text-section-heading font-semibold text-foreground">
              Comprehension quiz
            </h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {unit.quiz.length > 0 ? "Pass to complete the unit" : "No quiz in this unit"}
          </span>
        </div>

        {unit.quiz.length === 0 ? (
          <div className="app-surface flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              This unit has no quiz — mark it as completed once you have finished reading. You can
              add questions any time with the edit button above.
            </p>
            {progress.status === "completed" ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 aria-hidden="true" size={16} /> Completed
              </span>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  void markUnitCompleted(unit.id)
                  void logActivity()
                }}
                className="shrink-0"
              >
                <CheckCircle2 aria-hidden="true" />
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
                  "flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
                  passed ? "bg-success/10" : "bg-amber-500/10",
                )}
              >
                <div className="flex items-center gap-3">
                  {passed ? (
                    <CheckCircle2 aria-hidden="true" size={24} className="shrink-0 text-success" />
                  ) : (
                    <RotateCcw aria-hidden="true" size={24} className="shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {score}/{unit.quiz.length} correct
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {passed
                        ? "Unit completed! The vocabulary you saved will come back in your reviews."
                        : "Almost there — re-read the text above and try again."}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRetryQuiz} className="shrink-0">
                  <RotateCcw aria-hidden="true" /> Retry
                </Button>
              </div>
            )}

            <div className="app-surface divide-y divide-border">
              {unit.quiz.map((q, qi) => {
                const selected = answers[qi]
                return (
                  <div
                    key={qi}
                    role="group"
                    aria-label={`Question ${qi + 1}`}
                    className="p-4 sm:p-5"
                  >
                    <p className="font-medium text-foreground">
                      <span className="mr-2 text-muted-foreground">Q{qi + 1}.</span>
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
                            aria-pressed={isSelected}
                            className={cn(
                              "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                              isCorrect
                                ? "border-success bg-success/10 text-emerald-700 dark:text-emerald-400"
                                : isWrongPick
                                  ? "border-destructive/50 bg-destructive/5 text-destructive"
                                  : isSelected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-border text-foreground hover:bg-muted",
                            )}
                          >
                            <span lang={hasHangul(opt) ? "ko" : undefined}>{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 aria-hidden="true" size={16} className="shrink-0" />
                            )}
                            {isWrongPick && (
                              <XCircle aria-hidden="true" size={16} className="shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <div className="app-surface-muted mt-3 flex items-start gap-2 p-3 text-sm leading-relaxed text-muted-foreground">
                        <Lightbulb
                          aria-hidden="true"
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
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
                size="lg"
                className="w-full sm:w-auto sm:px-8"
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
