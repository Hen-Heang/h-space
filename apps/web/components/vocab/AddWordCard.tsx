"use client"

import { useState } from "react"
import { Plus, PencilLine } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getApiErrorMessage, vocabApi } from "@/lib/api"
import type { VocabItem } from "@/lib/types"

type AddWordCardProps = {
  /** Existing topics, offered as suggestions (user can also type a new one). */
  categories: string[]
  onAdd: (data: {
    category?: string
    term: string
    meaning: string
    example?: string
  }) => Promise<VocabItem>
  /**
   * Lets a bare-term capture (no meaning typed) get enriched in the
   * background right after saving — capture never waits on this.
   */
  onUpdate?: (
    id: string,
    data: { term: string; meaning: string; example?: string; pronunciation?: string },
  ) => Promise<void>
  /** Renders without the card chrome/header, for use inside the Add Words dialog. */
  embedded?: boolean
}

export function AddWordCard({ categories, onAdd, onUpdate, embedded = false }: AddWordCardProps) {
  const [term, setTerm] = useState("")
  const [meaning, setMeaning] = useState("")
  const [example, setExample] = useState("")
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState(false)

  // Only the Korean term is required — capture should take seconds. A blank
  // meaning gets a best-effort AI fill-in afterward (see enrich() below); the
  // word is real and saved either way, with or without that follow-up.
  const canSave = term.trim() && !saving

  async function enrich(id: string, savedTerm: string) {
    try {
      const looked = await vocabApi.lookup(savedTerm)
      await onUpdate?.(id, {
        term: savedTerm,
        meaning: looked.definition,
        example: looked.example ?? undefined,
      })
    } catch {
      // Best-effort — the word is already saved with a blank meaning either
      // way; the learner can always fill it in by editing the card.
    }
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const trimmedTerm = term.trim()
      const trimmedMeaning = meaning.trim()
      const saved = await onAdd({
        term: trimmedTerm,
        meaning: trimmedMeaning,
        example: example.trim() || undefined,
        category: category.trim() || undefined,
      })
      toast.success("Word added", {
        description: category.trim() ? `Saved to “${category.trim()}”.` : "Saved to your deck.",
      })
      setTerm("")
      setMeaning("")
      setExample("")
      // Keep the category so adding several words to one topic is quick.
      if (!trimmedMeaning) void enrich(saved.id, trimmedTerm)
    } catch (e) {
      toast.error("Could not add word", { description: getApiErrorMessage(e, "Please try again.") })
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all placeholder:font-medium placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"

  return (
    <div
      className={cn(
        !embedded &&
          "rounded-3xl border border-border bg-card p-5 shadow-xl dark:bg-slate-900/40 sm:rounded-3xl sm:p-8",
      )}
    >
      {!embedded && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Manual entry
              </p>
            </div>
            <h3 className="mt-3 text-xl font-bold text-foreground sm:mt-4 sm:text-2xl">
              Add a Word
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
              Type a Korean word and save — meaning is optional, Hengo can fill it in for you.
            </p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 sm:flex">
            <PencilLine size={24} strokeWidth={2.5} />
          </div>
        </div>
      )}

      <div className={cn("grid gap-3 sm:grid-cols-2", !embedded && "mt-6 sm:mt-8")}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term (한국어) *"
          className={inputClass}
          lang="ko"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="Meaning (English) — optional, AI can fill this in"
          className={inputClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Example sentence (optional)"
          className={`${inputClass} sm:col-span-2`}
          lang="ko"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
        />
        <div className="sm:col-span-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Topic / category (e.g. Weather Exam) — pick or create"
            className={inputClass}
            list="vocab-topics"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave()
            }}
          />
          <datalist id="vocab-topics">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          embedded ? "mt-4" : "mt-6 border-t border-border/60 pt-6 sm:mt-8 sm:pt-8",
        )}
      >
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="h-14 w-full rounded-2xl bg-emerald-600 px-6 text-base font-bold text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          <Plus size={20} strokeWidth={2.5} className="mr-2 shrink-0" />
          {saving ? "Saving…" : "Add to deck"}
        </Button>
        {categories.length > 0 && (
          <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground sm:text-right">
            {categories.length} {categories.length === 1 ? "topic" : "topics"} so far
          </p>
        )}
      </div>
    </div>
  )
}
