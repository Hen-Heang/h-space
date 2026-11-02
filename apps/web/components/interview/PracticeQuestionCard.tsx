"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Ear, Gauge, Languages, Loader2, Play, RotateCcw } from "lucide-react"

import { getCachedAudioUrl } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { PracticeQuestion } from "@/lib/answer-practice"
import { canReplay } from "@/lib/answer-practice"
import { registerSpeechAudio } from "@/lib/speech-audio"

/**
 * The question in answer practice: audio first, Korean text and English on
 * demand. Formerly ListeningQuestionCard (speaking drill) plus the listening
 * drill's QuestionAudioBar play limit. Whether the text is visible is owned by
 * the session (the listening preset keeps it hidden until review).
 */
export function PracticeQuestionCard({
  question,
  questionNumber,
  total,
  resetKey,
  textRevealed,
  canRevealText,
  onRevealText,
  allowEnglish,
  allowSlow,
  maxPlays,
  onPlayingChange,
  onPlaybackEnded,
}: {
  question: PracticeQuestion
  questionNumber: number
  total: number
  /** Changes per question (and per retry) to reset playback state. */
  resetKey: string
  textRevealed: boolean
  /** The reveal button is offered (always in speaking; only after answering in listening). */
  canRevealText: boolean
  onRevealText: () => void
  /** The English translation may be shown (off in the listening exam level). */
  allowEnglish: boolean
  allowSlow: boolean
  /** Successful plays allowed for this question, including the automatic one; null = unlimited. */
  maxPlays: number | null
  onPlayingChange: (playing: boolean) => void
  /** Fired only when playback finishes naturally (not when stopped). */
  onPlaybackEnded?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [showEnglish, setShowEnglish] = useState(false)
  const [autoPlayedKey, setAutoPlayedKey] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const onEndedRef = useRef(onPlaybackEnded)
  useEffect(() => {
    onEndedRef.current = onPlaybackEnded
  }, [onPlaybackEnded])

  // New question or retry: reset playback state (adjusting state during
  // render, React's recommended pattern for "reset on prop change").
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey)
    setPlaysUsed(0)
    setShowEnglish(false)
  }
  useEffect(() => () => stopRef.current?.(), [resetKey])

  const exhausted = !canReplay(playsUsed, maxPlays)
  const playsLeft = maxPlays === null ? null : Math.max(0, maxPlays - playsUsed)

  const play = useCallback(
    async (rate: number) => {
      if (loading || playing || exhausted || !question.ko) return
      setLoading(true)
      try {
        const url = await getCachedAudioUrl(question.ko)
        stopRef.current?.()
        const audio = new Audio(url)
        audio.playbackRate = rate
        stopRef.current = registerSpeechAudio(audio, () => {
          setPlaying(false)
          onPlayingChange(false)
          stopRef.current = null
          if (audio.ended) onEndedRef.current?.()
        })
        await audio.play()
        // play() resolved — the listen actually started, so it counts. A
        // blocked iOS autoplay never burns a limited listen.
        setPlaying(true)
        onPlayingChange(true)
        setPlaysUsed((count) => count + 1)
      } catch {
        stopRef.current?.()
        setPlaying(false)
        onPlayingChange(false)
      } finally {
        setLoading(false)
      }
    },
    [exhausted, loading, onPlayingChange, playing, question.ko],
  )

  // Speak each new question once, best-effort.
  useEffect(() => {
    if (autoPlayedKey === resetKey || !question.ko) return
    setAutoPlayedKey(resetKey)
    void play(1)
  }, [autoPlayedKey, play, question.ko, resetKey])

  const englishAvailable = allowEnglish && Boolean(question.en) && (textRevealed || canRevealText)

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Question {questionNumber} of {total}
          </p>
          <div
            className="flex items-center gap-2 text-sm font-medium text-primary"
            role="status"
            aria-live="polite"
          >
            <Ear className="size-4" aria-hidden="true" />
            {loading
              ? "Preparing audio"
              : playing
                ? "Playing Korean question"
                : "Listen before reading"}
          </div>
        </div>

        <div className="mt-5 min-h-24 rounded-2xl border border-dashed border-border bg-muted/20 p-5">
          {textRevealed ? (
            <p
              lang="ko"
              className="break-keep text-[22px] font-semibold leading-[1.55] text-foreground sm:text-2xl"
            >
              {question.ko}
            </p>
          ) : (
            <div className="flex min-h-14 items-center justify-center text-center">
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {canRevealText
                  ? "The Korean text is hidden. Listen for the topic and question ending first; replaying or revealing is a learning tool, not a failure."
                  : "Audio only — answer what you heard. The text appears when you review."}
              </p>
            </div>
          )}
          {showEnglish && englishAvailable ? (
            <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
              {question.en}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => play(1)}
            disabled={loading || playing || exhausted}
            aria-label="Play question normally"
            className="h-11 rounded-xl"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
            ) : playsUsed > 0 ? (
              <RotateCcw aria-hidden="true" className="mr-2 size-4" />
            ) : (
              <Play aria-hidden="true" className="mr-2 size-4" />
            )}
            Normal
          </Button>
          {allowSlow && (
            <Button
              type="button"
              variant="outline"
              onClick={() => play(0.75)}
              disabled={loading || playing || exhausted}
              aria-label="Play question slowly"
              className="h-11 rounded-xl"
            >
              <Gauge aria-hidden="true" className="mr-2 size-4" />
              {"0.75× slow"}
            </Button>
          )}
          {canRevealText && !textRevealed && (
            <Button
              type="button"
              variant="outline"
              onClick={onRevealText}
              className="h-11 rounded-xl"
            >
              Reveal Korean
            </Button>
          )}
          {englishAvailable && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEnglish((value) => !value)}
              aria-expanded={showEnglish}
              className="h-11 rounded-xl"
            >
              <Languages aria-hidden="true" className="mr-2 size-4" />
              {showEnglish ? "Hide English" : "Show English"}
            </Button>
          )}
        </div>
        {playsLeft !== null && (
          <p
            className={
              exhausted
                ? "mt-3 text-xs font-medium text-destructive"
                : "mt-3 text-xs text-muted-foreground"
            }
          >
            {exhausted
              ? "No listens left for this question"
              : `${playsLeft} listen${playsLeft === 1 ? "" : "s"} left`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
