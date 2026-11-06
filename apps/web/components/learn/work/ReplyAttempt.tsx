"use client"

import { useId, useState } from "react"
import { Loader2, Mic, Send, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { cn } from "@/lib/utils"

export interface ReplyAttemptInput {
  korean: string
  intendedMeaning: string
  /** "voice" when any of the text came from speech recognition. */
  inputMethod: "voice" | "text"
}

// The learner's own reply: Korean (typed, or dictated and then corrected),
// plus an optional English "what I mean" so feedback checks meaning first.
// The microphone is only requested when the learner taps it — never on load —
// and typing always works, including when speech is unsupported or denied.
export function ReplyAttempt({
  onSubmit,
  busy,
  submitLabel = "Check my reply",
  placeholder = "예: 확인하고 있습니다. 확인되는 대로 공유드리겠습니다.",
}: {
  onSubmit: (input: ReplyAttemptInput) => void | Promise<void>
  busy: boolean
  submitLabel?: string
  placeholder?: string
}) {
  const ids = useId()
  const [intendedMeaning, setIntendedMeaning] = useState("")
  const [usedVoice, setUsedVoice] = useState(false)
  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })
  const listening = speech.status === "listening"

  function toggleMic() {
    if (listening) {
      speech.stop()
      return
    }
    setUsedVoice(true)
    speech.start()
  }

  function submit() {
    const korean = (listening ? speech.stop() : speech.transcript).trim()
    if (!korean || busy) return
    void onSubmit({
      korean,
      intendedMeaning: intendedMeaning.trim(),
      inputMethod: usedVoice ? "voice" : "text",
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-meaning`}>What you mean (English, optional)</Label>
        <Input
          id={`${ids}-meaning`}
          value={intendedMeaning}
          onChange={(e) => setIntendedMeaning(e.target.value)}
          maxLength={300}
          placeholder="e.g. I'm still checking and will share soon."
          className="h-11 text-base sm:text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-korean`}>Your reply in Korean</Label>
        <Textarea
          id={`${ids}-korean`}
          lang="ko"
          value={speech.transcript}
          onChange={(e) => speech.setTranscript(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={placeholder}
          className="min-h-24 text-base leading-7"
        />
        <p className="text-xs text-muted-foreground">
          {listening
            ? "Listening… tap Stop when you're done. You can fix any mistakes before checking."
            : speech.supported
              ? "Type, or use the microphone and correct the text before checking."
              : "Voice input isn't available in this browser — type your reply."}
        </p>
        {speech.error && (
          <p role="status" className="text-xs font-medium text-destructive">
            {speech.error} You can type your reply instead.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {speech.supported && (
          <Button
            type="button"
            variant="outline"
            onClick={toggleMic}
            disabled={busy}
            aria-pressed={listening}
            className={cn("h-11", listening && "border-destructive/40 text-destructive")}
          >
            {listening ? (
              <Square aria-hidden="true" className="size-4" />
            ) : (
              <Mic aria-hidden="true" className="size-4" />
            )}
            {listening ? "Stop" : "Speak"}
          </Button>
        )}
        <Button
          type="button"
          onClick={submit}
          disabled={busy || (!speech.transcript.trim() && !listening)}
          className="h-11 sm:ml-auto"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="size-4" />
          )}
          {busy ? "Checking…" : submitLabel}
        </Button>
      </div>
    </div>
  )
}
