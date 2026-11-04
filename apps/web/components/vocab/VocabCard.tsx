"use client"

import { useId, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { VocabItem } from "@/lib/types"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { motion } from "motion/react"
import {
  Calendar,
  Tag,
  ChevronRight,
  BookOpen,
  Pencil,
  Check,
  X,
  Loader2,
  Trash2,
} from "lucide-react"
import { SentenceChallenge } from "@/components/vocab/SentenceChallenge"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { vocabApi } from "@/lib/api"

type VocabCardProps = {
  item: VocabItem
  onReview?: (id: string) => void
  onUpdate?: (
    id: string,
    data: { term: string; meaning: string; example?: string; pronunciation?: string },
  ) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
}

function formatReviewDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value === "-" ? "Not scheduled" : value
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  )
}

function EditForm({
  item,
  onSave,
  onCancel,
}: {
  item: VocabItem
  onSave: (data: {
    term: string
    meaning: string
    example?: string
    pronunciation?: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const fieldId = useId()
  const [term, setTerm] = useState(item.term)
  const [meaning, setMeaning] = useState(item.meaning)
  const [pronunciation, setPronunciation] = useState(item.pronunciation ?? "")
  const [example, setExample] = useState(item.example ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!term.trim() || !meaning.trim()) return
    setSaving(true)
    setError("")
    try {
      await onSave({
        term: term.trim(),
        meaning: meaning.trim(),
        pronunciation: pronunciation.trim() || undefined,
        example: example.trim() || undefined,
      })
    } catch {
      setError("Could not save changes.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label htmlFor={`${fieldId}-term`} className="text-xs font-semibold text-foreground">
          Korean word
        </label>
        <Input
          id={`${fieldId}-term`}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={200}
          lang="ko"
          className="mt-1.5 text-lg font-semibold"
        />
      </div>
      <div>
        <label htmlFor={`${fieldId}-meaning`} className="text-xs font-semibold text-foreground">
          English meaning
        </label>
        <Input
          id={`${fieldId}-meaning`}
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <label
          htmlFor={`${fieldId}-pronunciation`}
          className="text-xs font-semibold text-foreground"
        >
          Pronunciation
        </label>
        <Input
          id={`${fieldId}-pronunciation`}
          value={pronunciation}
          onChange={(e) => setPronunciation(e.target.value)}
          maxLength={300}
          placeholder="e.g. gong-gam"
          className="mt-1.5"
        />
      </div>
      <div>
        <label htmlFor={`${fieldId}-example`} className="text-xs font-semibold text-foreground">
          Example sentence
        </label>
        <Textarea
          id={`${fieldId}-example`}
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={2}
          lang="ko"
          className="mt-1.5 resize-none"
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !term.trim() || !meaning.trim()}
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} strokeWidth={3} />
          )}
          Save
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={saving}
          variant="outline"
          className="flex-1"
        >
          <X size={13} strokeWidth={3} />
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function VocabCard({ item, onReview, onUpdate, onDelete }: VocabCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const mastery = Math.max(0, Math.min(100, item.mastery))

  async function handleDelete() {
    if (!onDelete || deleting) return
    setDeleting(true)
    try {
      await onDelete(item.id)
      toast.success(`Deleted "${item.term}"`)
      setDeleteOpen(false)
    } catch {
      toast.error("Could not delete word. Please try again.")
      setDeleting(false)
    }
  }
  const masteryColor =
    mastery >= 80 ? "bg-emerald-500" : mastery >= 50 ? "bg-amber-500" : "bg-red-500"

  const masteryBg =
    mastery >= 80
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
      : mastery >= 50
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
        : "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400"

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition-all dark:bg-slate-900/40 dark:backdrop-blur-md sm:p-5 sm:hover:-translate-y-1 sm:hover:shadow-xl">
      {/* Mastery Progress Bar (Top) */}
      <div
        className="absolute inset-x-0 top-0 h-1 bg-accent/10"
        role="progressbar"
        aria-label={`Mastery for ${item.term}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={mastery}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${mastery}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full", masteryColor)}
        />
      </div>

      {editing && onUpdate ? (
        <EditForm
          item={item}
          onSave={async (data) => {
            await onUpdate(item.id, data)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 pt-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="min-w-0 break-keep text-2xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere] sm:truncate sm:text-3xl">
                  {item.term}
                </h3>
                <SpeakButton
                  text={item.term}
                  className="h-10 w-10 shrink-0 rounded-xl bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all active:scale-90"
                />
              </div>
              {item.pronunciation && (
                <p className="mt-0.5 text-xs font-bold text-muted-foreground italic">
                  [{item.pronunciation}]
                </p>
              )}
              <p
                className={cn(
                  "mt-2 text-lg font-bold leading-tight [overflow-wrap:anywhere] sm:text-xl",
                  item.meaning ? "text-muted-foreground" : "italic text-muted-foreground/50",
                )}
              >
                {item.meaning || "No meaning yet — tap to add"}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                {onUpdate && (
                  <Button
                    type="button"
                    onClick={() => setEditing(true)}
                    variant="ghost"
                    size="icon-lg"
                    className="rounded-xl text-muted-foreground"
                    aria-label="Edit word"
                  >
                    <Pencil size={14} strokeWidth={2.5} />
                  </Button>
                )}
                {onDelete && (
                  <AlertDialog
                    open={deleteOpen}
                    onOpenChange={(open) => {
                      if (!deleting) setDeleteOpen(open)
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${item.term}`}
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{item.term}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the word, its examples, and its review history from this
                          deck. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Keep word</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleting}
                          onClick={(event) => {
                            event.preventDefault()
                            void handleDelete()
                          }}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          {deleting ? "Deleting…" : "Delete word"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <div
                  className={cn(
                    "shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1",
                    masteryBg,
                  )}
                >
                  {mastery}%
                </div>
              </div>
              {item.difficultyLevel && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                    item.difficultyLevel === "Easy"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : item.difficultyLevel === "Medium"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-red-500/10 text-red-600",
                  )}
                >
                  {item.difficultyLevel}
                </span>
              )}
            </div>
          </div>

          {/* Context/Example */}
          {item.example && (
            <div className="mt-6 rounded-2xl border border-border bg-accent/5 p-4 dark:bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={12} className="text-muted-foreground/40" />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Usage Context
                </span>
              </div>
              <p className="text-sm font-bold leading-relaxed text-foreground/80 [overflow-wrap:anywhere] sm:text-base">
                {item.example}
              </p>
              {item.exampleTranslation && (
                <p className="mt-2 text-xs font-medium italic text-muted-foreground leading-relaxed [overflow-wrap:anywhere]">
                  {item.exampleTranslation}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Metadata */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.length > 0 ? (
            item.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-accent/30 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/70"
              >
                <Tag size={10} strokeWidth={3} />
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs font-bold text-muted-foreground italic">No tags</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Calendar size={12} strokeWidth={3} />
          <span>Next review: {formatReviewDate(item.nextReview)}</span>
        </div>
      </div>

      {onReview && (
        <Button
          type="button"
          onClick={() => onReview(item.id)}
          className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-500"
        >
          Complete Review
          <ChevronRight size={16} strokeWidth={3} />
        </Button>
      )}

      <SentenceChallenge
        cardId={item.id}
        term={item.term}
        onGetChallenge={(id) => vocabApi.getSentenceChallenge(id)}
        onCheckSentence={(id, challengePrompt, attempt) =>
          vocabApi.checkSentence(id, { challengePrompt, attempt })
        }
      />
    </div>
  )
}
