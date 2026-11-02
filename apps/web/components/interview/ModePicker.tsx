"use client"

import { useRef, type KeyboardEvent } from "react"
import { TimerIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InterviewMode } from "@/lib/interview-modes"
import { INTERVIEW_MODES } from "@/lib/interview-modes"
import { cn } from "@/lib/utils"

const MODE_IDS = Object.keys(INTERVIEW_MODES) as InterviewMode[]

/**
 * Practice vs Exam Simulation as one segmented control (a radio group:
 * arrow keys move the choice), then the chosen mode's rules. Purely
 * presentational; the chosen mode's config drives the prompts and session UI.
 */
export function ModePicker({
  value,
  onChange,
}: {
  value: InterviewMode
  onChange: (mode: InterviewMode) => void
}) {
  const buttons = useRef<Partial<Record<InterviewMode, HTMLButtonElement | null>>>({})
  const cfg = INTERVIEW_MODES[value]

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    const next = MODE_IDS[(MODE_IDS.indexOf(value) + step + MODE_IDS.length) % MODE_IDS.length]
    onChange(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Interview mode"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {MODE_IDS.map((id) => {
          const active = value === id
          return (
            <button
              key={id}
              ref={(node) => {
                buttons.current[id] = node
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              onKeyDown={onKeyDown}
              className={cn(
                "min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {INTERVIEW_MODES[id].label}
            </button>
          )
        })}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{cfg.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">
          {cfg.durationSeconds ? (
            <>
              <TimerIcon aria-hidden="true" className="mr-1 size-3" />
              {Math.round(cfg.durationSeconds / 60)} min
            </>
          ) : (
            "Untimed"
          )}
        </Badge>
        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">
          {cfg.showEnglish ? "English on demand" : "Korean only"}
        </Badge>
        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">
          {cfg.showFeedback ? "Feedback every turn" : "Feedback at the end"}
        </Badge>
      </div>
    </div>
  )
}
