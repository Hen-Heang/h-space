"use client"

import { AlertTriangle, CheckCircle2, Info } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { cn } from "@/lib/utils"

export interface ReplyFeedbackValue {
  /** What the learner submitted (after their own corrections). */
  submitted: string
  /** null when no intended meaning was given. */
  meaningPreserved: boolean | null
  meaningNote?: string | null
  /** Overall: did the reply get the message across? null if not graded. */
  communicated?: boolean | null
  corrected: string
  natural?: string | null
  explanation?: string | null
  pattern?: string | null
  inputMethod: "voice" | "text"
}

// Feedback for a reply attempt, meaning first: did it say what you meant,
// then the corrected sentence and one reusable pattern. Always labelled as
// text-based — this is never a pronunciation or acoustic score.
export function ReplyFeedback({ value }: { value: ReplyFeedbackValue }) {
  const meaningKnown = value.meaningPreserved != null
  const ok = meaningKnown ? value.meaningPreserved : (value.communicated ?? true)
  const changed = value.corrected.trim() && value.corrected.trim() !== value.submitted.trim()

  return (
    <section aria-label="Reply feedback" className="space-y-3" aria-live="polite">
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3.5",
          ok ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
        )}
      >
        {ok ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {meaningKnown
              ? ok
                ? "It says what you meant"
                : "The meaning changed"
              : ok
                ? "Your reply gets the message across"
                : "Not quite there yet"}
          </p>
          {value.meaningNote && (
            <p className="text-sm text-muted-foreground">{value.meaningNote}</p>
          )}
          {value.explanation && (
            <p className="text-sm text-muted-foreground">{value.explanation}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border p-3.5">
        <p className="text-xs font-medium text-muted-foreground">
          {changed ? "Corrected" : "Your reply — no correction needed"}
        </p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <p
            lang="ko"
            className="min-w-0 break-keep text-base font-semibold leading-7 text-foreground [overflow-wrap:anywhere]"
          >
            {value.corrected || value.submitted}
          </p>
          <SpeakButton
            text={value.corrected || value.submitted}
            className="size-11 shrink-0"
            title="Listen to the corrected reply"
          />
        </div>
        {changed && (
          <p className="mt-2 text-xs text-muted-foreground">
            You wrote: <span lang="ko">{value.submitted}</span>
          </p>
        )}
      </div>

      {value.natural && value.natural.trim() !== (value.corrected || value.submitted).trim() && (
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-xs font-medium text-muted-foreground">Another natural way</p>
          <p lang="ko" className="mt-1 break-keep text-base leading-7 text-foreground">
            {value.natural}
          </p>
        </div>
      )}

      {value.pattern && (
        <div className="rounded-xl bg-primary/5 p-3.5">
          <p className="text-xs font-medium text-primary">Pattern to reuse</p>
          <p lang="ko" className="mt-1 text-base text-foreground">
            {value.pattern}
          </p>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {value.inputMethod === "voice"
          ? "Checked from the text of what you said (after your edits) — this isn't a pronunciation score."
          : "Checked from the text you typed — meaning, grammar and politeness, not pronunciation."}
      </p>
    </section>
  )
}
