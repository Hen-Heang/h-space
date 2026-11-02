"use client"

import { useId } from "react"
import { AlertCircle, Keyboard, Mic, Square } from "lucide-react"

import { MicAccessNotice } from "@/components/interview/MicAccessNotice"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { AnswerMode } from "@/hooks/useAnswerMode"
import type { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { cn } from "@/lib/utils"

// Errors the MicAccessNotice already explains; showing them twice is noise.
const NOTICE_ERROR_KINDS = new Set(["permission", "no-mic", "unsupported"])

/**
 * One answer box for every Exam Prep practice: record with the mic, then fix
 * the transcript — or type, when the learner prefers or recording can't work.
 * The textarea holds the exact text that gets checked.
 */
export function AnswerInput({
  speech,
  mode,
  disabled = false,
  audioPlaying = false,
  placeholder = "Type your Korean answer…",
  onCaptured,
}: {
  speech: ReturnType<typeof useSpeechRecognition>
  mode: AnswerMode
  disabled?: boolean
  /** Question audio is playing — recording now would capture it. */
  audioPlaying?: boolean
  placeholder?: string
  /** Called with the raw speech-to-text when the learner stops recording. */
  onCaptured?: (detected: string) => void
}) {
  const textareaId = useId()
  const hintId = useId()
  const recording = speech.status === "listening"
  const { typing } = mode
  const showEditor = typing || (!recording && speech.transcript.length > 0)
  const showError = speech.error && !NOTICE_ERROR_KINDS.has(speech.errorKind ?? "")

  function toggleRecording() {
    if (recording) {
      onCaptured?.(speech.stop())
      return
    }
    if (audioPlaying) {
      speech.setError("Wait until the question audio finishes before recording.")
      return
    }
    speech.start()
  }

  function switchToTyping() {
    if (recording) onCaptured?.(speech.stop())
    mode.setTypingRequested(true)
  }

  return (
    <div className="space-y-4">
      <MicAccessNotice
        access={mode.access}
        typing={typing}
        onRetry={() => {
          mode.setTypingRequested(false)
          speech.start()
        }}
      />

      {!typing && (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-muted/20 p-5 text-center">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={disabled || audioPlaying}
            aria-label={recording ? "Stop recording" : "Start recording"}
            aria-pressed={recording}
            className={cn(
              "flex size-20 items-center justify-center rounded-full text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              recording ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary/90",
            )}
          >
            {recording ? (
              <Square aria-hidden="true" className="size-7 fill-current" />
            ) : (
              <Mic aria-hidden="true" className="size-8" />
            )}
          </button>
          <p
            role="status"
            aria-live="polite"
            className="mt-3 text-sm font-semibold text-foreground"
          >
            {recording
              ? "Listening — pauses are okay. Tap to stop."
              : audioPlaying
                ? "Question audio is playing"
                : speech.transcript
                  ? "Tap to add more, or check the text below"
                  : "Tap to answer out loud"}
          </p>
          {recording && (
            <p lang="ko" className="mt-3 min-h-6 break-keep text-base text-foreground">
              {speech.transcript}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={switchToTyping}
            disabled={disabled}
            className="mt-2 h-11 text-sm font-semibold text-muted-foreground"
          >
            <Keyboard aria-hidden="true" /> Type instead
          </Button>
        </div>
      )}

      {showEditor && (
        <div className="space-y-2">
          <label htmlFor={textareaId} className="block text-sm font-semibold text-foreground">
            Your answer
          </label>
          <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
            {typing
              ? "Type your answer in Korean."
              : "Fix any recognition mistakes — this exact text is what gets checked."}
          </p>
          <Textarea
            id={textareaId}
            lang="ko"
            aria-describedby={hintId}
            value={speech.transcript}
            onChange={(event) => speech.setTranscript(event.target.value)}
            disabled={disabled || recording}
            placeholder={placeholder}
            className="min-h-28 rounded-xl bg-background text-base leading-relaxed"
          />
          {typing && !mode.typingForced && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => mode.setTypingRequested(false)}
              disabled={disabled}
              className="h-11 text-sm font-semibold text-muted-foreground"
            >
              <Mic aria-hidden="true" /> Use the microphone
            </Button>
          )}
        </div>
      )}

      {showError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{speech.error}</p>
        </div>
      )}
    </div>
  )
}
