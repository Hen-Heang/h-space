"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronRight, Eye, Gauge, Headphones, Loader2, RotateCcw } from "lucide-react"

import { getCachedAudioUrl } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { ReplyAttempt, type ReplyAttemptInput } from "@/components/learn/work/ReplyAttempt"
import { ReplyFeedback, type ReplyFeedbackValue } from "@/components/learn/work/ReplyFeedback"
import { WorkContextSummary } from "@/components/learn/work/WorkContextSummary"
import { RevealText } from "@/components/phrasebook/RevealText"
import { dailyMissionQueryKey } from "@/hooks/useDailyMission"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { RomanizationMode } from "@/lib/korean-coach/schemas"
import { situationLabel } from "@/lib/korean-phrasebook/labels"
import { registerSpeechAudio } from "@/lib/speech-audio"
import type { PhraseAttemptFeedback, PhraseCardWithProgress } from "@/lib/types"

const SPEEDS = [0.75, 1] as const

// One work message at a time: situation first → listen (no autoplay) →
// work out what's being asked → check understanding → reply in 1–3 sentences
// (typed, or spoken and corrected) → meaning-first feedback. The model reply
// stays hidden until the learner has tried or asks for it. Only a graded,
// saved reply counts as evidence for Today's Mission — not opening this page
// or pressing Play.
export function WorkMessageModeView({
  cards,
  romanizationPreference,
  onExhausted,
}: {
  cards: PhraseCardWithProgress[]
  romanizationPreference: RomanizationMode
  onExhausted: () => void
}) {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [showText, setShowText] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [showModel, setShowModel] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState<ReplyFeedbackValue | null>(null)
  // Set when grading worked but saving the attempt didn't — lets "Save
  // again" retry just the save, without grading (or paying for) it twice.
  const [unsaved, setUnsaved] = useState<{
    input: ReplyAttemptInput
    stored: PhraseAttemptFeedback
  } | null>(null)
  const [attemptKey, setAttemptKey] = useState(0)

  const card = cards[index]
  if (!card) return null
  const context = card.workContext
  const recommended = card.answers.find((a) => a.isRecommended) ?? card.answers[0]
  const showRomanization = romanizationPreference !== "never"

  async function play(rate: number) {
    if (playing != null || !card) return
    setPlaying(rate)
    setError("")
    try {
      const audio = new Audio(await getCachedAudioUrl(card.question.korean))
      audio.playbackRate = rate
      registerSpeechAudio(audio, () => setPlaying(null))
      await audio.play()
    } catch {
      setPlaying(null)
      setError("Couldn't play the audio. Check your connection, or read the message instead.")
    }
  }

  async function saveAttempt(input: ReplyAttemptInput, stored: PhraseAttemptFeedback) {
    await phrasebookApi.recordAttempt({
      phraseId: card.id,
      practiceMode: "speak",
      inputMethod: input.inputMethod,
      transcript: input.korean,
      feedback: stored,
      transcriptRevealed: showText,
      taskCompleted: true,
    })
    setUnsaved(null)
    // The hub's Continue card re-checks evidence on its next read.
    void queryClient.invalidateQueries({ queryKey: dailyMissionQueryKey(getUserId()) })
  }

  async function submit(input: ReplyAttemptInput) {
    setBusy(true)
    setError("")
    try {
      const result = await phrasebookApi.evaluateSpeaking(card.id, input.korean, {
        intendedMeaning: input.intendedMeaning,
        inputMethod: input.inputMethod,
      })
      const stored: PhraseAttemptFeedback = {
        recognizedTranscript: input.korean,
        communicationSuccess: result.communicationSuccess,
        correctedSentence: result.correctedSentence,
        naturalAlternative: result.naturalAlternative,
        explanation: result.explanation,
        vocabulary: result.vocabulary,
        retryWords: result.retryWords,
        meaningPreserved: result.meaningPreserved ?? null,
        pattern: result.pattern ?? null,
      }
      setFeedback({
        submitted: input.korean,
        meaningPreserved: input.intendedMeaning ? (result.meaningPreserved ?? null) : null,
        communicated: result.communicationSuccess,
        corrected: result.correctedSentence,
        natural: result.naturalAlternative,
        explanation: result.explanation,
        pattern: result.pattern ?? null,
        inputMethod: input.inputMethod,
      })
      setShowModel(true)
      try {
        await saveAttempt(input, stored)
      } catch (err) {
        setUnsaved({ input, stored })
        setError(getApiErrorMessage(err, "Your feedback is below, but this attempt wasn't saved."))
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't check your reply. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  async function retrySave() {
    if (!unsaved) return
    setBusy(true)
    setError("")
    try {
      await saveAttempt(unsaved.input, unsaved.stored)
    } catch (err) {
      setError(getApiErrorMessage(err, "Still couldn't save this attempt."))
    } finally {
      setBusy(false)
    }
  }

  function tryAgain() {
    setFeedback(null)
    setUnsaved(null)
    setError("")
    setAttemptKey((k) => k + 1)
  }

  function next() {
    if (index + 1 >= cards.length) {
      onExhausted()
      return
    }
    setIndex((i) => i + 1)
    setShowText(false)
    setShowContext(false)
    setShowModel(false)
    setFeedback(null)
    setUnsaved(null)
    setError("")
    setAttemptKey((k) => k + 1)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span className="truncate">{situationLabel(card.situation)}</span>
      </div>

      {/* 1. Situation first, then listen. */}
      <section aria-labelledby="work-message-heading" className="app-surface space-y-4 p-4 sm:p-6">
        <div>
          <h3 id="work-message-heading" className="text-base font-semibold text-foreground">
            A coworker says…
          </h3>
          {context?.whyUseful && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Why this is useful: </span>
              {context.whyUseful}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Listen to the message">
          {SPEEDS.map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={rate === 0.75 ? "default" : "outline"}
              className="h-11"
              onClick={() => void play(rate)}
              disabled={playing != null}
            >
              {playing === rate ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : rate === 0.75 ? (
                <Headphones aria-hidden="true" className="size-4" />
              ) : (
                <Gauge aria-hidden="true" className="size-4" />
              )}
              {rate === 0.75 ? "Listen slowly" : "Normal speed"}
            </Button>
          ))}
          {!showText && (
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setShowText(true)}
            >
              <Eye aria-hidden="true" className="size-4" /> Show the text
            </Button>
          )}
        </div>

        {showText && (
          <div className="space-y-1.5 rounded-xl bg-muted/50 p-3.5">
            <p
              lang="ko"
              className="break-keep text-lg font-semibold leading-8 text-foreground [overflow-wrap:anywhere]"
            >
              {card.question.korean}
            </p>
            {showRomanization && (
              <RevealText
                label="romanization"
                value={card.question.romanization}
                initiallyVisible={romanizationPreference === "always"}
                textClassName="text-sm italic text-muted-foreground"
              />
            )}
            <RevealText
              label="English"
              value={card.question.english}
              initiallyVisible={false}
              textClassName="text-sm text-muted-foreground"
            />
          </div>
        )}
      </section>

      {/* 2. Understand: think first, then check. */}
      {context && (
        <section
          aria-labelledby="work-understand-heading"
          className="app-surface space-y-3 p-4 sm:p-6"
        >
          <h3 id="work-understand-heading" className="text-base font-semibold text-foreground">
            What do they want you to do?
          </h3>
          {showContext ? (
            <WorkContextSummary context={context} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Say it to yourself first: the action, the conditions, and anything that&apos;s
                unclear.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setShowContext(true)}
              >
                Check my understanding
              </Button>
            </>
          )}
        </section>
      )}

      {/* 3. Reply. */}
      <section aria-labelledby="work-reply-heading" className="app-surface space-y-4 p-4 sm:p-6">
        <div>
          <h3 id="work-reply-heading" className="text-base font-semibold text-foreground">
            Your reply
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            1–3 sentences, in 해요체 or 합니다체. Say only what&apos;s true — “확인하겠습니다” (will
            check) isn&apos;t “확인했습니다” (checked).
          </p>
        </div>

        {feedback ? (
          <ReplyFeedback value={feedback} />
        ) : (
          <ReplyAttempt key={`${card.id}-${attemptKey}`} onSubmit={submit} busy={busy} />
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        {unsaved && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => void retrySave()}
            disabled={busy}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Save attempt again
          </Button>
        )}

        <div className="border-t border-border pt-3">
          {showModel ? (
            recommended && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Model reply</p>
                <p
                  lang="ko"
                  className="break-keep text-base font-semibold leading-7 text-foreground"
                >
                  {recommended.korean}
                </p>
                {showRomanization && (
                  <RevealText
                    label="romanization"
                    value={recommended.romanization}
                    initiallyVisible={romanizationPreference === "always"}
                    textClassName="text-sm italic text-muted-foreground"
                  />
                )}
                <p className="text-sm text-muted-foreground">{recommended.english}</p>
              </div>
            )
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setShowModel(true)}
            >
              <Eye aria-hidden="true" className="size-4" /> Show the model reply
            </Button>
          )}
        </div>
      </section>

      {feedback && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-11 sm:flex-1" onClick={tryAgain}>
            <RotateCcw aria-hidden="true" className="size-4" /> Try again
          </Button>
          <Button type="button" className="h-11 sm:flex-1" onClick={next}>
            {index + 1 >= cards.length ? "Finish" : "Next message"}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
