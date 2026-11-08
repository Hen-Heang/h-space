"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  BookmarkPlus,
  BookOpenText,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api"
import { READING_CATEGORIES, type ReadingCategory, type ReadingUnit } from "@/lib/reading"
import { createReadingUnit, updateReadingUnit, type ReadingUnitPayload } from "@/lib/reading-store"
import type { QuizQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"

type ParagraphDraft = { korean: string; english: string }
type VocabDraft = { term: string; meaning: string; example: string }
type QuizDraft = {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

const LEVELS = ["Beginner", "Intermediate"] as const

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BookOpenText
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" size={18} className="text-muted-foreground" />
        <h3 className="text-section-heading font-semibold text-foreground">{title}</h3>
      </div>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium text-foreground">{children}</p>
}

export function UnitEditor({ unit }: { unit?: ReadingUnit }) {
  const router = useRouter()
  const isEdit = Boolean(unit)

  const [title, setTitle] = useState(unit?.title ?? "")
  const [titleEnglish, setTitleEnglish] = useState(unit?.titleEnglish ?? "")
  const [episode, setEpisode] = useState(unit?.episode ?? "")
  const [source, setSource] = useState(unit?.source ?? "")
  const [summary, setSummary] = useState(unit?.summary ?? "")
  const [category, setCategory] = useState<ReadingCategory>(unit?.category ?? "DAILY_LIFE")
  const [level, setLevel] = useState<ReadingUnit["level"]>(unit?.level ?? "Beginner")
  const [grammarPattern, setGrammarPattern] = useState(unit?.grammarNote?.pattern ?? "")
  const [grammarExplanation, setGrammarExplanation] = useState(unit?.grammarNote?.explanation ?? "")

  const [paragraphs, setParagraphs] = useState<ParagraphDraft[]>(
    unit?.paragraphs.map((p) => ({ korean: p.korean, english: p.english })) ?? [
      { korean: "", english: "" },
    ],
  )
  const [vocab, setVocab] = useState<VocabDraft[]>(
    unit?.vocab.map((v) => ({ term: v.term, meaning: v.meaning, example: v.example ?? "" })) ?? [
      { term: "", meaning: "", example: "" },
    ],
  )
  const [quiz, setQuiz] = useState<QuizDraft[]>(
    unit?.quiz.map((q) => ({
      question: q.question,
      options: [...q.options],
      answerIndex: q.answerIndex,
      explanation: q.explanation,
    })) ?? [],
  )

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function updateParagraph(index: number, patch: Partial<ParagraphDraft>) {
    setParagraphs((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function updateVocab(index: number, patch: Partial<VocabDraft>) {
    setVocab((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function updateQuiz(index: number, patch: Partial<QuizDraft>) {
    setQuiz((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  function updateQuizOption(qIndex: number, oIndex: number, value: string) {
    setQuiz((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    )
  }

  function removeQuizOption(qIndex: number, oIndex: number) {
    setQuiz((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = q.options.filter((_, j) => j !== oIndex)
        let answerIndex = q.answerIndex
        if (oIndex === q.answerIndex) answerIndex = 0
        else if (oIndex < q.answerIndex) answerIndex = q.answerIndex - 1
        return { ...q, options, answerIndex }
      }),
    )
  }

  async function handleSave() {
    setError("")

    if (!title.trim()) return setError("The Korean title is required.")
    if (!titleEnglish.trim()) return setError("The English title is required.")

    const cleanParagraphs = paragraphs
      .map((p) => ({ korean: p.korean.trim(), english: p.english.trim() }))
      .filter((p) => p.korean)
    if (cleanParagraphs.length === 0) return setError("Add at least one paragraph of Korean text.")

    const cleanVocab = vocab
      .map((v) => ({ term: v.term.trim(), meaning: v.meaning.trim(), example: v.example.trim() }))
      .filter((v) => v.term && v.meaning)
      .map((v) => ({
        term: v.term,
        meaning: v.meaning,
        ...(v.example ? { example: v.example } : {}),
      }))

    const cleanQuiz: QuizQuestion[] = []
    for (let i = 0; i < quiz.length; i++) {
      const q = quiz[i]
      if (!q.question.trim()) continue
      const kept: string[] = []
      let answerIndex = -1
      q.options.forEach((option, j) => {
        const text = option.trim()
        if (!text) return
        if (j === q.answerIndex) answerIndex = kept.length
        kept.push(text)
      })
      if (kept.length < 2) return setError(`Question ${i + 1} needs at least 2 options.`)
      if (answerIndex === -1) return setError(`Pick the correct answer for question ${i + 1}.`)
      cleanQuiz.push({
        question: q.question.trim(),
        options: kept,
        answerIndex,
        explanation: q.explanation.trim(),
      })
    }

    const payload: ReadingUnitPayload = {
      title: title.trim(),
      titleEnglish: titleEnglish.trim(),
      category,
      level,
      summary: summary.trim(),
      source: source.trim() || "My collection",
      ...(episode.trim() ? { episode: episode.trim() } : {}),
      ...(grammarPattern.trim()
        ? {
            grammarNote: {
              pattern: grammarPattern.trim(),
              explanation: grammarExplanation.trim(),
            },
          }
        : {}),
      paragraphs: cleanParagraphs,
      vocab: cleanVocab,
      quiz: cleanQuiz,
    }

    setSaving(true)
    try {
      const saved = unit
        ? await updateReadingUnit(unit.id, payload)
        : await createReadingUnit(payload)
      toast.success(isEdit ? "Unit updated." : "Unit created.")
      router.push(`/reading/${saved.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this unit."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-4">
        {/* Phones get MobileHeader's back button, so this is desktop-only. */}
        <BackLink
          href={isEdit ? `/reading/${unit!.id}` : "/phrasebook?mode=reading"}
          label={isEdit ? "Back to unit" : "All units"}
          desktopOnly
        />

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit unit" : "Create a new unit"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Paste any Korean text you want to study — an article, a podcast transcript, a work
            message — then add vocabulary and quiz questions to make it reviewable.
          </p>
        </div>
      </div>

      {/* ── Basics ── */}
      <section className="space-y-3">
        <SectionHeader icon={BookOpenText} title="Basics" />
        <div className="space-y-4 app-surface p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Korean title *</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 한국의 카페"
              />
            </div>
            <div>
              <FieldLabel>English title *</FieldLabel>
              <Input
                value={titleEnglish}
                onChange={(e) => setTitleEnglish(e.target.value)}
                placeholder="e.g. Cafes in Korea"
              />
            </div>
            <div>
              <FieldLabel>Episode / label (optional)</FieldLabel>
              <Input
                value={episode}
                onChange={(e) => setEpisode(e.target.value)}
                placeholder="e.g. EP 27"
              />
            </div>
            <div>
              <FieldLabel>Source (optional)</FieldLabel>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Naver blog, textbook, podcast"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Summary</FieldLabel>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One or two sentences about what this text covers."
              className="min-h-16"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Category</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(READING_CATEGORIES) as ReadingCategory[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    aria-pressed={category === key}
                    className={cn(
                      "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                      category === key
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {READING_CATEGORIES[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Level</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    aria-pressed={level === l}
                    className={cn(
                      "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                      level === l
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grammar note ── */}
      <section className="space-y-3">
        <SectionHeader icon={GraduationCap} title="Grammar focus" hint="Optional" />
        <div className="space-y-4 app-surface p-5 sm:p-6">
          <div>
            <FieldLabel>Pattern</FieldLabel>
            <Input
              value={grammarPattern}
              onChange={(e) => setGrammarPattern(e.target.value)}
              placeholder="예: [장소]에 가다 / 오다"
            />
          </div>
          <div>
            <FieldLabel>Explanation</FieldLabel>
            <Textarea
              value={grammarExplanation}
              onChange={(e) => setGrammarExplanation(e.target.value)}
              placeholder="Short explanation of how the pattern works, with an example."
              className="min-h-16"
            />
          </div>
        </div>
      </section>

      {/* ── Paragraphs ── */}
      <section className="space-y-3">
        <SectionHeader
          icon={BookOpenText}
          title="Text"
          hint="One Korean paragraph per block — at least one required"
        />
        <div className="space-y-3">
          {paragraphs.map((p, i) => (
            <div key={i} className="space-y-3 app-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Paragraph {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setParagraphs((prev) => prev.filter((_, j) => j !== i))}
                  disabled={paragraphs.length === 1}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  title="Remove paragraph"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Textarea
                value={p.korean}
                onChange={(e) => updateParagraph(i, { korean: e.target.value })}
                placeholder="한국어 텍스트…"
              />
              <Textarea
                value={p.english}
                onChange={(e) => updateParagraph(i, { english: e.target.value })}
                placeholder="English translation (optional but recommended)…"
                className="min-h-14"
              />
            </div>
          ))}
          <Button
            type="button"
            onClick={() => setParagraphs((prev) => [...prev, { korean: "", english: "" }])}
            variant="outline"
            className="border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus aria-hidden="true" /> Add paragraph
          </Button>
        </div>
      </section>

      {/* ── Vocabulary ── */}
      <section className="space-y-3">
        <SectionHeader icon={BookmarkPlus} title="Key vocabulary" hint="Optional" />
        <div className="space-y-2">
          {vocab.map((v, i) => (
            <div key={i} className="app-surface grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
              <Input
                value={v.term}
                onChange={(e) => updateVocab(i, { term: e.target.value })}
                placeholder="단어 (term)"
              />
              <Input
                value={v.meaning}
                onChange={(e) => updateVocab(i, { meaning: e.target.value })}
                placeholder="Meaning"
              />
              <Input
                value={v.example}
                onChange={(e) => updateVocab(i, { example: e.target.value })}
                placeholder="Example sentence (optional)"
              />
              <button
                type="button"
                onClick={() => setVocab((prev) => prev.filter((_, j) => j !== i))}
                className="self-center rounded-lg p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Remove word"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => setVocab((prev) => [...prev, { term: "", meaning: "", example: "" }])}
            variant="outline"
            className="border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus aria-hidden="true" /> Add word
          </Button>
        </div>
      </section>

      {/* ── Quiz ── */}
      <section className="space-y-3">
        <SectionHeader
          icon={GraduationCap}
          title="Comprehension quiz"
          hint="Optional — without a quiz, the unit is completed manually"
        />
        <div className="space-y-3">
          {quiz.map((q, qi) => (
            <div key={qi} className="space-y-3 app-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Question {qi + 1}</span>
                <button
                  type="button"
                  onClick={() => setQuiz((prev) => prev.filter((_, j) => j !== qi))}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Remove question"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Input
                value={q.question}
                onChange={(e) => updateQuiz(qi, { question: e.target.value })}
                placeholder="질문 (question)"
              />
              <div className="space-y-2">
                {q.options.map((option, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuiz(qi, { answerIndex: oi })}
                      title="Mark as correct answer"
                      aria-label={`Option ${oi + 1} is the correct answer`}
                      aria-pressed={q.answerIndex === oi}
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors [@media(pointer:coarse)]:size-11",
                        q.answerIndex === oi
                          ? "border-success bg-success/10 text-success"
                          : "border-border text-muted-foreground/50 hover:text-muted-foreground",
                      )}
                    >
                      <CheckCircle2 aria-hidden="true" size={16} />
                    </button>
                    <Input
                      value={option}
                      onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeQuizOption(qi, oi)}
                      disabled={q.options.length <= 2}
                      className="rounded-lg p-2 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                      title="Remove option"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {q.options.length < 4 && (
                  <button
                    type="button"
                    onClick={() => updateQuiz(qi, { options: [...q.options, ""] })}
                    className="inline-flex min-h-9 items-center gap-1.5 px-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Plus aria-hidden="true" size={14} /> Add option
                  </button>
                )}
              </div>
              <Input
                value={q.explanation}
                onChange={(e) => updateQuiz(qi, { explanation: e.target.value })}
                placeholder="Explanation shown after answering (optional)"
              />
              <p className="text-sm text-muted-foreground">
                Tap the ✓ next to an option to mark it as the correct answer.
              </p>
            </div>
          ))}
          <Button
            type="button"
            onClick={() =>
              setQuiz((prev) => [
                ...prev,
                { question: "", options: ["", ""], answerIndex: 0, explanation: "" },
              ])
            }
            variant="outline"
            className="border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus aria-hidden="true" /> Add question
          </Button>
        </div>
      </section>

      {/* ── Save ── */}
      <div className="space-y-3">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={saving} size="lg" className="px-8">
            {saving ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isEdit ? "Save changes" : "Create unit"}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={isEdit ? `/reading/${unit!.id}` : "/phrasebook?mode=reading"}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
