import type { ReactNode } from "react"
import { Info } from "lucide-react"

import { cn } from "@/lib/utils"

// One wording for every Exam Prep score that comes from speech-to-text. No
// route ever analyzes the audio itself, so the copy must never imply it does.

/** AI-graded answers (speaking check, mock interview scorecard). */
export const PRONUNCIATION_DISCLAIMER =
  "Estimated from the speech-recognition transcript — not direct audio pronunciation analysis."

/** Mock interview scorecard: names the two criteria the transcript can't really measure. */
export const MOCK_SCORECARD_DISCLAIMER =
  "Scored from the speech-recognition transcript of your answers. The app never analyzes your audio, so Pronunciation and Confidence are rough signals, not a pronunciation score."

/** Listen & Repeat: a word match, not a grade. */
export const REPEAT_MATCH_DISCLAIMER =
  "Compares the speech-recognition transcript with the sentence. A miss can mean the recognizer misheard you, not that you said it wrong."

/** Listen & Repeat answers typed because the mic isn't available. */
export const TYPED_ATTEMPT_NOTE = "Typed answer — this checks recall, not speaking."

export function ScoreHonestyNote({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
