"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ChevronRight, Loader2, Mic, RotateCcw, Square, XCircle } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { PhraseAttemptFeedback, PhraseCardWithProgress } from "@/lib/types"

interface SpeakingModeViewProps {
  cards: PhraseCardWithProgress[]
  onExhausted: () => void
}

export function SpeakingModeView({ cards, onExhausted }: SpeakingModeViewProps) {
  const [index, setIndex] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState<PhraseAttemptFeedback | null>(null)
  const [error, setError] = useState("")
  const {
    supported,
    status,
    transcript,
    start,
    stop,
    reset,
    error: speechError,
  } = useSpeechRecognition({ lang: "ko-KR" })

  const card = cards[index]

  useEffect(() => {
    reset()
    setFeedback(null)
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  async function submitAnswer(finalTranscript: string) {
    if (!card || !finalTranscript.trim()) return
    setEvaluating(true)
    setError("")
    try {
      const result = await phrasebookApi.evaluateSpeaking(card.id, finalTranscript.trim())
      const nextFeedback: PhraseAttemptFeedback = {
        recognizedTranscript: finalTranscript.trim(),
        communicationSuccess: result.communicationSuccess,
        correctedSentence: result.correctedSentence,
        naturalAlternative: result.naturalAlternative,
        explanation: result.explanation,
        vocabulary: result.vocabulary,
        retryWords: result.retryWords,
      }
      setFeedback(nextFeedback)
      await phrasebookApi.recordAttempt({
        phraseId: card.id,
        practiceMode: "speak",
        inputMethod: "voice",
        transcript: finalTranscript.trim(),
        feedback: nextFeedback,
        taskCompleted: true,
      })
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not evaluate your answer. Please try again."))
    } finally {
      setEvaluating(false)
    }
  }

  function handleStop() {
    const captured = stop()
    if (captured) void submitAnswer(captured)
  }

  function retry() {
    reset()
    setFeedback(null)
    setError("")
  }

  function next() {
    if (index + 1 >= cards.length) {
      onExhausted()
      return
    }
    setIndex((i) => i + 1)
  }

  if (!card) return null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>{card.situation}</span>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 text-center dark:bg-slate-900/40 sm:p-8">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Answer aloud
        </span>
        <p className="break-keep text-2xl font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
          {card.question.korean}
        </p>
        <p className="text-sm text-muted-foreground">{card.question.english}</p>
        <SpeakButton text={card.question.korean} title="Listen to the question" />
      </div>

      {!supported && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          Speech recognition isn&apos;t available in this browser. Try Chrome on desktop or Android.
        </p>
      )}
      {speechError && (
        <p className="text-center text-xs font-semibold text-destructive">{speechError}</p>
      )}
      {error && <p className="text-center text-xs font-semibold text-destructive">{error}</p>}

      {!feedback && (
        <div className="flex flex-col items-center gap-4">
          {transcript && (
            <p className="max-w-md break-keep rounded-2xl bg-accent/5 px-4 py-3 text-center text-base font-medium text-foreground [overflow-wrap:anywhere]">
              {transcript}
            </p>
          )}
          <button
            type="button"
            disabled={!supported || evaluating}
            onClick={status === "listening" ? handleStop : start}
            aria-label={status === "listening" ? "Stop recording" : "Record your spoken answer"}
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95 disabled:opacity-50",
              status === "listening"
                ? "animate-pulse bg-red-600 shadow-red-600/30"
                : "bg-violet-600 shadow-violet-600/30 hover:bg-violet-500",
            )}
          >
            {evaluating ? (
              <Loader2 size={32} className="animate-spin" />
            ) : status === "listening" ? (
              <Square size={28} />
            ) : (
              <Mic size={28} />
            )}
          </button>
          <p className="text-xs font-semibold text-muted-foreground">
            {evaluating
              ? "Evaluating your answer..."
              : status === "listening"
                ? "Tap to stop"
                : "Tap to record your answer"}
          </p>
        </div>
      )}

      {feedback && (
        <div className="space-y-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4",
              feedback.communicationSuccess
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-amber-500/20 bg-amber-500/5",
            )}
          >
            {feedback.communicationSuccess ? (
              <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
            ) : (
              <XCircle size={22} className="shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-bold",
                  feedback.communicationSuccess
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400",
                )}
              >
                {feedback.communicationSuccess
                  ? "You communicated the meaning"
                  : "Not quite there yet"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {feedback.explanation}
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            You said: &quot;{feedback.recognizedTranscript}&quot;
          </p>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                  Corrected
                </p>
                <p className="break-keep text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {feedback.correctedSentence}
                </p>
              </div>
              <SpeakButton
                text={feedback.correctedSentence}
                className="shrink-0"
                title="Listen to the corrected answer"
              />
            </div>
          </div>

          {feedback.naturalAlternative &&
            feedback.naturalAlternative !== feedback.correctedSentence && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      More natural
                    </p>
                    <p className="break-keep text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                      {feedback.naturalAlternative}
                    </p>
                  </div>
                  <SpeakButton
                    text={feedback.naturalAlternative}
                    className="shrink-0"
                    title="Listen to the natural alternative"
                  />
                </div>
              </div>
            )}

          {feedback.vocabulary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {feedback.vocabulary.map((v) => (
                <span
                  key={v.korean}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <span className="font-bold">{v.korean}</span> — {v.english}
                </span>
              ))}
            </div>
          )}

          {feedback.retryWords.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
                Worth retrying
              </p>
              <div className="flex flex-wrap gap-2">
                {feedback.retryWords.map((w) => (
                  <span
                    key={w}
                    className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={retry}>
              <RotateCcw size={14} className="mr-1.5" /> Retry
            </Button>
            <Button className="flex-1" onClick={next}>
              {index + 1 >= cards.length ? "Finish" : "Next"}{" "}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
