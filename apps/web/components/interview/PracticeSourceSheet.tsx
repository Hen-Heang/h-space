"use client"

import { useId, useState } from "react"
import { Sparkles } from "lucide-react"

import { LevelPicker } from "@/components/interview/LevelPicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { PracticeSource } from "@/lib/answer-practice"
import type { ListeningLevel } from "@/lib/interview-drills"
import type { PracticeDifficulty } from "@/lib/interview-practice"
import { cn } from "@/lib/utils"

const DIFFICULTIES: { id: PracticeDifficulty; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "normal", label: "Normal" },
  { id: "challenging", label: "Challenging" },
  { id: "mixed", label: "Mixed exam" },
]

export interface PracticeSettings {
  source: Exclude<PracticeSource, "selected">
  difficulty: PracticeDifficulty
  listeningLevel: ListeningLevel
}

/**
 * Advanced question selection, kept out of the session's way: where the
 * questions come from, Today's 5 difficulty, and (listening) how hard the
 * audio is. "Choose from the question bank" hands off to the bank browser.
 */
export function PracticeSourceSheet({
  open,
  onOpenChange,
  current,
  recommended,
  weakAvailable,
  showListeningLevel,
  onApply,
  onBrowseBank,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: PracticeSettings
  recommended: PracticeDifficulty
  weakAvailable: boolean
  showListeningLevel: boolean
  onApply: (settings: PracticeSettings) => void
  onBrowseBank: () => void
}) {
  const sourceLabelId = useId()
  const difficultyLabelId = useId()
  const [draft, setDraft] = useState(current)
  // Reopening starts from the session's settings, not a stale draft.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(current)
  }

  const sources: {
    id: PracticeSettings["source"]
    label: string
    description: string
    disabled?: boolean
  }[] = [
    {
      id: "today",
      label: "Today's 5",
      description: "Must-practice, new, and weak questions first.",
    },
    {
      id: "weak",
      label: "Weak questions",
      description: weakAvailable
        ? "Questions you've practiced that aren't strong yet."
        : "Finish a few questions first to find your weak ones.",
      disabled: !weakAvailable,
    },
    {
      id: "ai",
      label: "AI questions",
      description: "New questions in the exam's style. Uses an AI call.",
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:max-w-xl sm:rounded-t-2xl"
      >
        <SheetHeader>
          <SheetTitle>Change questions</SheetTitle>
          <SheetDescription>
            Answers you already checked stay saved. A new set starts from its first question.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <fieldset>
            <legend id={sourceLabelId} className="text-sm font-semibold text-foreground">
              Questions
            </legend>
            <div role="radiogroup" aria-labelledby={sourceLabelId} className="mt-2 space-y-2">
              {sources.map((source) => {
                const active = draft.source === source.id
                return (
                  <button
                    key={source.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={source.disabled}
                    onClick={() => setDraft((d) => ({ ...d, source: source.id }))}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 size-3.5 shrink-0 rounded-full border-2",
                        active ? "border-primary bg-primary" : "border-muted-foreground/50",
                      )}
                    />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {source.label}
                        {source.id === "ai" && (
                          <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {source.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <Button
              type="button"
              variant="link"
              onClick={onBrowseBank}
              className="mt-1 h-11 px-0 text-sm"
            >
              Or choose questions from the bank…
            </Button>
          </fieldset>

          {draft.source === "today" && (
            <fieldset>
              <legend id={difficultyLabelId} className="text-sm font-semibold text-foreground">
                Level
              </legend>
              <div
                role="radiogroup"
                aria-labelledby={difficultyLabelId}
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {DIFFICULTIES.map((level) => {
                  const active = draft.difficulty === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setDraft((d) => ({ ...d, difficulty: level.id }))}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                      )}
                    >
                      {level.label}
                      {level.id === recommended && (
                        <Badge variant="secondary" className="text-xs">
                          Suggested
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {showListeningLevel && (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Listening level</p>
              <LevelPicker
                value={draft.listeningLevel}
                onChange={(listeningLevel) => setDraft((d) => ({ ...d, listeningLevel }))}
              />
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 border-t border-border bg-background">
          <Button type="button" size="lg" onClick={() => onApply(draft)} className="h-12 w-full">
            Start this set
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
