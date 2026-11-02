"use client"

import { useId } from "react"

import { LISTENING_LEVELS, type ListeningLevel } from "@/lib/interview-drills"
import { cn } from "@/lib/utils"

/**
 * Listening level as a compact radio list (used in the "Change questions"
 * sheet). The chosen level's config drives play limits, slow replay, English
 * on review, and the AI question prompt.
 */
export function LevelPicker({
  value,
  onChange,
}: {
  value: ListeningLevel
  onChange: (level: ListeningLevel) => void
}) {
  const labelId = useId()
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="space-y-2">
      <span id={labelId} className="sr-only">
        Listening level
      </span>
      {(Object.keys(LISTENING_LEVELS) as ListeningLevel[]).map((id) => {
        const cfg = LISTENING_LEVELS[id]
        const active = value === id
        const facts = [
          cfg.maxPlays === null
            ? "unlimited listens"
            : `${cfg.maxPlays} listen${cfg.maxPlays === 1 ? "" : "s"}`,
          cfg.allowSlowReplay ? "slow replay" : "normal speed only",
          cfg.showEnglishOnReveal ? null : "no English",
        ].filter(Boolean)
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
              <span className="block text-sm font-semibold text-foreground">{cfg.label}</span>
              <span className="block text-xs text-muted-foreground">{facts.join(" · ")}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
