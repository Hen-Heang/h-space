"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  phraseCardContentSchema,
  type PhraseCardContentInput,
} from "@/lib/korean-phrasebook/schemas"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import type { PhraseAnswerContent, PhraseCollection, PhraseVocabularyItem } from "@/lib/types"

const DIFFICULTIES = ["easy", "medium", "hard"] as const
const REGISTERS = ["formal", "polite"] as const

function emptyAnswer(): PhraseAnswerContent {
  return { korean: "", romanization: "", english: "", register: "polite", isRecommended: false }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{children}</label>
  )
}

function NewPhraseCardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardId = searchParams.get("cardId")
  const presetCollectionId = searchParams.get("collectionId")
  const isEdit = Boolean(cardId)

  const [collections, setCollections] = useState<PhraseCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [collectionId, setCollectionId] = useState("")
  const [category, setCategory] = useState("workplace")
  const [situation, setSituation] = useState("")
  const [difficulty, setDifficulty] = useState<PhraseCardContentInput["difficulty"]>("medium")
  const [questionKorean, setQuestionKorean] = useState("")
  const [questionRomanization, setQuestionRomanization] = useState("")
  const [questionEnglish, setQuestionEnglish] = useState("")
  const [questionRegister, setQuestionRegister] =
    useState<PhraseAnswerContent["register"]>("polite")
  const [questionVariants, setQuestionVariants] = useState<string[]>([])
  const [answers, setAnswers] = useState<PhraseAnswerContent[]>([
    { ...emptyAnswer(), isRecommended: true },
  ])
  const [usageNote, setUsageNote] = useState("")
  const [vocabulary, setVocabulary] = useState<PhraseVocabularyItem[]>([])
  const [tagsInput, setTagsInput] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const collectionsRes = await phrasebookApi.getCollections()
        if (!active) return
        setCollections(collectionsRes)
        setCollectionId(
          presetCollectionId ||
            collectionsRes.find((c) => !c.sourceKey)?.id ||
            collectionsRes[0]?.id ||
            "",
        )

        if (cardId) {
          const card = await phrasebookApi.getCard(cardId)
          if (!active) return
          setCollectionId(card.collectionId)
          setCategory(card.category)
          setSituation(card.situation)
          setDifficulty(card.difficulty)
          setQuestionKorean(card.question.korean)
          setQuestionRomanization(card.question.romanization)
          setQuestionEnglish(card.question.english)
          setQuestionRegister(card.question.register)
          setQuestionVariants(card.questionVariants)
          setAnswers(card.answers)
          setUsageNote(card.usageNote ?? "")
          setVocabulary(card.vocabulary)
          setTagsInput(card.tags.join(", "))
        }
      } catch (err) {
        toast.error("Could not load form data", {
          description: getApiErrorMessage(err, "Please try again."),
        })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId])

  function buildContent(): unknown {
    return {
      category: category.trim(),
      situation: situation.trim(),
      difficulty,
      question: {
        korean: questionKorean.trim(),
        romanization: questionRomanization.trim(),
        english: questionEnglish.trim(),
        register: questionRegister,
      },
      questionVariants: questionVariants.map((v) => v.trim()).filter(Boolean),
      answers: answers
        .filter((a) => a.korean.trim())
        .map((a) => ({
          ...a,
          korean: a.korean.trim(),
          romanization: a.romanization.trim(),
          english: a.english.trim(),
        })),
      usageNote: usageNote.trim() || undefined,
      vocabulary: vocabulary.filter((v) => v.korean.trim() && v.english.trim()),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors([])
    const content = buildContent()
    const result = phraseCardContentSchema.safeParse(content)
    if (!result.success) {
      setErrors(result.error.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`))
      return
    }
    if (!collectionId) {
      setErrors(["Choose a collection."])
      return
    }
    setSaving(true)
    try {
      if (isEdit && cardId) {
        await phrasebookApi.updateCard(cardId, result.data)
        if (collectionId) await phrasebookApi.moveCard(cardId, collectionId)
      } else {
        await phrasebookApi.createCard(collectionId, result.data)
      }
      toast.success(isEdit ? "Card updated" : "Card created")
      router.push(`/phrasebook/${collectionId}`)
    } catch (err) {
      toast.error("Could not save this card", {
        description: getApiErrorMessage(err, "Please try again."),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!cardId) return
    setDeleteOpen(false)
    try {
      await phrasebookApi.deleteCard(cardId)
      toast.success("Card deleted")
      router.push("/phrasebook")
    } catch (err) {
      toast.error("Could not delete this card", {
        description: getApiErrorMessage(err, "Please try again."),
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-12">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <BackLink href="/phrasebook" label="Phrasebook" />
        {isEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} className="mr-1.5" /> Delete
          </Button>
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground">
        {isEdit ? "Edit Q&A card" : "New Q&A card"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.length > 0 && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
            <ul className="space-y-0.5 text-xs font-semibold text-destructive">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Collection</FieldLabel>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titleEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="workplace, daily, ..."
              required
            />
          </div>
          <div>
            <FieldLabel>Situation</FieldLabel>
            <Input
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="deadline, small-talk, ..."
              required
            />
          </div>
          <div>
            <FieldLabel>Difficulty</FieldLabel>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Main question
          </p>
          <div>
            <FieldLabel>Korean</FieldLabel>
            <Input
              value={questionKorean}
              onChange={(e) => setQuestionKorean(e.target.value)}
              lang="ko"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Romanization</FieldLabel>
              <Input
                value={questionRomanization}
                onChange={(e) => setQuestionRomanization(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>English</FieldLabel>
              <Input
                value={questionEnglish}
                onChange={(e) => setQuestionEnglish(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <FieldLabel>Register</FieldLabel>
            <Select
              value={questionRegister}
              onValueChange={(v) => setQuestionRegister(v as typeof questionRegister)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTERS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "formal" ? "격식체 (Formal)" : "해요체 (Polite)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StringListEditor
            label="Question variations"
            values={questionVariants}
            onChange={setQuestionVariants}
            placeholder="Another natural way to ask..."
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Answers
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnswers((prev) => [...prev, emptyAnswer()])}
            >
              <Plus size={13} className="mr-1" /> Add answer
            </Button>
          </div>
          {answers.map((answer, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/70 bg-accent/5 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={answer.korean}
                  onChange={(e) =>
                    setAnswers((prev) =>
                      prev.map((a, idx) => (idx === i ? { ...a, korean: e.target.value } : a)),
                    )
                  }
                  placeholder="Korean answer"
                  lang="ko"
                />
                <Input
                  value={answer.romanization}
                  onChange={(e) =>
                    setAnswers((prev) =>
                      prev.map((a, idx) =>
                        idx === i ? { ...a, romanization: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Romanization"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={answer.english}
                  onChange={(e) =>
                    setAnswers((prev) =>
                      prev.map((a, idx) => (idx === i ? { ...a, english: e.target.value } : a)),
                    )
                  }
                  placeholder="English meaning"
                />
                <Select
                  value={answer.register}
                  onValueChange={(v) =>
                    setAnswers((prev) =>
                      prev.map((a, idx) =>
                        idx === i ? { ...a, register: v as typeof a.register } : a,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTERS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "formal" ? "격식체 (Formal)" : "해요체 (Polite)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={answer.usageNote ?? ""}
                onChange={(e) =>
                  setAnswers((prev) =>
                    prev.map((a, idx) => (idx === i ? { ...a, usageNote: e.target.value } : a)),
                  )
                }
                placeholder="Usage note (optional)"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={answer.isRecommended}
                    onChange={(e) =>
                      setAnswers((prev) =>
                        prev.map((a, idx) =>
                          idx === i ? { ...a, isRecommended: e.target.checked } : a,
                        ),
                      )
                    }
                    className="h-4 w-4"
                  />
                  Recommended answer
                </label>
                {answers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAnswers((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <FieldLabel>Usage note (optional)</FieldLabel>
          <Textarea value={usageNote} onChange={(e) => setUsageNote(e.target.value)} rows={2} />
        </div>

        <div className="rounded-2xl border border-border p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Vocabulary (optional)
          </p>
          <VocabularyEditor values={vocabulary} onChange={setVocabulary} />
        </div>

        <div>
          <FieldLabel>Tags (comma-separated, optional)</FieldLabel>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="standup, deadline"
          />
        </div>

        {/* mr-16 keeps the bar clear of the shell's floating AI Assistant
            button (right-4, size-14) until the form column is narrow enough
            on wide screens to leave that corner free. */}
        <div className="sticky bottom-[calc(var(--shell-bottom-nav-h,0px)+1rem)] z-10 mr-16 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-xl xl:mr-0 dark:bg-slate-900/90">
          <Button type="submit" disabled={saving} className="h-12 w-full">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create card"}
          </Button>
        </div>
      </form>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes its progress and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="mb-1.5 text-xs font-semibold text-primary hover:underline"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {values.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(values.map((v, idx) => (idx === i ? e.target.value : v)))}
              placeholder={placeholder}
              lang="ko"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label="Remove"
            >
              <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function VocabularyEditor({
  values,
  onChange,
}: {
  values: PhraseVocabularyItem[]
  onChange: (next: PhraseVocabularyItem[]) => void
}) {
  return (
    <div className="space-y-2">
      {values.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item.korean}
            onChange={(e) =>
              onChange(values.map((v, idx) => (idx === i ? { ...v, korean: e.target.value } : v)))
            }
            placeholder="Korean"
            lang="ko"
            className="flex-1"
          />
          <Input
            value={item.english}
            onChange={(e) =>
              onChange(values.map((v, idx) => (idx === i ? { ...v, english: e.target.value } : v)))
            }
            placeholder="English"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            aria-label="Remove"
          >
            <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, { korean: "", english: "" }])}
        className="text-xs font-semibold text-primary hover:underline"
      >
        + Add word
      </button>
    </div>
  )
}

export default function NewPhraseCardPage() {
  return (
    <Suspense fallback={null}>
      <NewPhraseCardInner />
    </Suspense>
  )
}
