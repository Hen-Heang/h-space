"use client"

import { useState } from "react"
import { CalendarDays, Check, Flag, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { goalsApi, getApiErrorMessage } from "@/lib/api"
import type { Goal } from "@/lib/goals"
import { cn } from "@/lib/utils"

export type Milestone = { title: string; due_date?: string; done?: boolean }

function formatDue(due?: string): string | null {
  if (!due) return null
  try {
    // Stored as yyyy-MM-dd (date input) or ISO; parseISO handles both.
    return format(parseISO(due), "MMM d")
  } catch {
    return null
  }
}

/**
 * Checkable milestone list for a goal — the "detailed things I want to achieve"
 * layer that sits above the day-to-day tasks. Persists in the goal's JSON
 * `metadata.milestones` (no backend change), and reports the updated goal up so
 * the page's React Query cache stays in sync.
 *
 * `suggestions` (optional) powers a one-tap starter list when empty — used to
 * seed exam goals from the study plan.
 */
export function GoalMilestones({
  goal,
  onGoalUpdated,
  suggestions = [],
}: {
  goal: Goal
  onGoalUpdated: (goal: Goal) => void
  suggestions?: Milestone[]
}) {
  const milestones = (goal.metadata?.milestones ?? []) as Milestone[]
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")

  const doneCount = milestones.filter((m) => m.done).length
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0

  async function persist(next: Milestone[]) {
    const prev = goal
    // Optimistic — reflect the change instantly, then reconcile / roll back.
    onGoalUpdated({ ...goal, metadata: { ...goal.metadata, milestones: next } })
    setSaving(true)
    try {
      const updated = await goalsApi.update(goal.id, {
        metadata: { ...goal.metadata, milestones: next },
      })
      onGoalUpdated(updated)
    } catch (err) {
      onGoalUpdated(prev)
      toast.error(getApiErrorMessage(err, "Couldn't save milestones. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  function toggle(index: number) {
    void persist(milestones.map((m, i) => (i === index ? { ...m, done: !m.done } : m)))
  }

  function remove(index: number) {
    void persist(milestones.filter((_, i) => i !== index))
  }

  function add() {
    const title = newTitle.trim()
    if (!title) return
    void persist([...milestones, { title, ...(newDate ? { due_date: newDate } : {}) }])
    setNewTitle("")
    setNewDate("")
    setAdding(false)
  }

  return (
    <Card className="border-border bg-card/50 p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Sub-goals</h3>
          <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            milestones
          </span>
          {saving && <Loader2 size={13} className="animate-spin text-muted-foreground/40" />}
        </div>
        {milestones.length > 0 && (
          <span className="text-xs font-bold tabular-nums text-foreground">
            {doneCount}
            <span className="text-muted-foreground"> / {milestones.length}</span>
          </span>
        )}
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-foreground/5">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* List */}
      <div className="mt-5 space-y-2">
        {milestones.map((m, i) => {
          const due = formatDue(m.due_date)
          return (
            <div
              key={`${m.title}-${i}`}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-label={m.done ? "Mark not done" : "Mark done"}
                aria-pressed={m.done}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90",
                  m.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent hover:border-primary/50",
                )}
              >
                <Check size={14} strokeWidth={3} />
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1 break-words text-sm font-bold leading-snug",
                  m.done ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {m.title}
              </span>
              {due && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent/40 px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays size={11} />
                  {due}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Delete milestone"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 active:scale-90"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}

        {milestones.length === 0 && !adding && (
          <p className="rounded-2xl border border-dashed border-border bg-background/30 px-4 py-5 text-center text-sm font-medium text-muted-foreground">
            Add sub-goals to break this into clear checkpoints — each one you check off moves the
            milestone bar forward.
          </p>
        )}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-primary/30 bg-primary/[0.03] p-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              } else if (e.key === "Escape") {
                setAdding(false)
              }
            }}
            placeholder="What do you want to achieve?"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground outline-none focus:border-primary/40"
            />
            <button
              type="button"
              onClick={add}
              disabled={!newTitle.trim()}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              <Check size={14} strokeWidth={3} /> Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancel"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
          >
            <Plus size={14} /> Add sub-goal
          </button>

          {/* One-tap starter list (e.g. exam goals seeded from the study plan). */}
          {milestones.length === 0 && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => void persist(suggestions)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={14} /> Add suggested milestones
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
