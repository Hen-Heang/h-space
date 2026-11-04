"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiErrorMessage, goalsApi, type AiTaskDraft } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AiTaskPlanDialogProps {
  isOpen: boolean
  goalId: string
  goalType?: string
  onClose: () => void
  onApplied: () => void
}

const COUNTS = [5, 7, 10]

// Naming an actual app feature here matters: LearningPracticeCard matches
// these same keywords to turn generated tasks into "Practice →" links.
const EDUCATION_NOTE_PRESETS = [
  "Focus on workplace vocabulary and daily phrases",
  "Mix in roleplay scenarios and listening practice",
  "Prioritize speaking practice and grammar corrections",
]

/**
 * AI task drafting with a mandatory review step. `goalsApi.previewTasks` only
 * reads; nothing reaches the database until the user picks drafts and presses
 * Apply (see docs/goal-planning-scheduling-audit.md — the old flow inserted
 * tasks the instant the model responded).
 */
export function AiTaskPlanDialog({
  isOpen,
  goalId,
  goalType,
  onClose,
  onApplied,
}: AiTaskPlanDialogProps) {
  const [count, setCount] = useState(7)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [drafts, setDrafts] = useState<AiTaskDraft[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!isOpen) {
      setDrafts(null)
      setSelected(new Set())
    }
  }, [isOpen])

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const result = await goalsApi.previewTasks(goalId, { count, note: note.trim() || undefined })
      setDrafts(result)
      setSelected(new Set(result.map((_, i) => i)))
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not draft a plan right now."))
    } finally {
      setLoading(false)
    }
  }, [goalId, count, note])

  const apply = async (indices: number[]) => {
    const chosen = indices.map((i) => drafts?.[i]).filter((d): d is AiTaskDraft => !!d)
    if (chosen.length === 0) return
    setApplying(true)
    try {
      const created = await goalsApi.createTasksFromDrafts(goalId, chosen)
      onApplied()
      onClose()
      toast.success(`Added ${created.length} task${created.length === 1 ? "" : "s"}`, {
        description: "They're in the backlog — schedule them from the Schedule tab.",
      })
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save these tasks."))
    } finally {
      setApplying(false)
    }
  }

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const editTitle = (index: number, title: string) =>
    setDrafts((prev) => prev?.map((d, i) => (i === index ? { ...d, title } : d)) ?? prev)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-violet-500" /> Draft a task plan
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            Review and edit the draft before anything is saved. Nothing is created until you apply.
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {drafts === null ? (
            <>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">How many tasks?</legend>
                <div className="flex gap-2">
                  {COUNTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCount(c)}
                      aria-pressed={count === c}
                      className={cn(
                        "h-11 flex-1 rounded-xl border text-sm font-semibold transition-colors",
                        count === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="ai-note">Anything specific? (optional)</Label>
                <Input
                  id="ai-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. focus on speaking practice, beginner level…"
                  className="h-11 rounded-xl"
                />
                {goalType === "education" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {EDUCATION_NOTE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNote(preset)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <ul className="space-y-2">
              {drafts.length === 0 && (
                <li className="text-sm font-medium text-muted-foreground">
                  The model returned no tasks. Try again with a more specific note.
                </li>
              )}
              {drafts.map((draft, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 transition-colors",
                    selected.has(i) ? "border-primary/40 bg-primary/[0.03]" : "border-border/60",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      aria-label={`Include "${draft.title}"`}
                      className="mt-2 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Input
                        value={draft.title}
                        onChange={(e) => editTitle(i, e.target.value)}
                        aria-label={`Task ${i + 1} title`}
                        className="h-10 rounded-lg text-sm font-medium"
                      />
                      <p className="text-xs font-medium text-muted-foreground">
                        {draft.start_date} → {draft.end_date}
                        {draft.duration_minutes ? ` · ${draft.duration_minutes}m` : ""}
                      </p>
                      {draft.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {draft.description}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onClick={onClose} className="h-11 flex-1 rounded-xl">
            Cancel
          </Button>
          {drafts === null ? (
            <Button
              onClick={() => void generate()}
              disabled={loading}
              className="h-11 flex-[2] gap-2 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Drafting…" : "Draft plan"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void apply([...selected].sort((a, b) => a - b))}
                disabled={applying || selected.size === 0}
                className="h-11 flex-1 rounded-xl text-xs font-semibold"
              >
                Apply selected ({selected.size})
              </Button>
              <Button
                onClick={() => void apply(drafts.map((_, i) => i))}
                disabled={applying || drafts.length === 0}
                className="h-11 flex-1 rounded-xl text-xs font-semibold"
              >
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply all
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
