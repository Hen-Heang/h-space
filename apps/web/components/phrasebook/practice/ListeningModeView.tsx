"use client"

import { useCallback, useMemo, useState } from "react"
import { CheckCircle2, ChevronRight, Eye, Gauge, Loader2, Volume2, XCircle } from "lucide-react"

import { getCachedAudioUrl } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { shuffle } from "@/lib/vocab-review"
import { cn } from "@/lib/utils"
import type { PhraseAnswerContent, PhraseCardWithProgress } from "@/lib/types"
import { situationLabel } from "@/lib/korean-phrasebook/labels"

interface ListeningModeViewProps {
  cards: PhraseCardWithProgress[]
  onExhausted: () => void
}

const SPEEDS = [0.75, 1, 1.25] as const

function answerOptions(
  card: PhraseCardWithProgress,
  pool: PhraseCardWithProgress[],
): PhraseAnswerContent[] {
  const correct = card.answers.find((a) => a.isRecommended) ?? card.answers[0]
  const distractors = shuffle(pool.filter((c) => c.id !== card.id))
    .slice(0, 3)
    .map((c) => c.answers.find((a) => a.isRecommended) ?? c.answers[0])
    .filter(Boolean)
  return shuffle([correct, ...distractors])
}

export function ListeningModeView({ cards, onExhausted }: ListeningModeViewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const card = cards[index]
  const options = useMemo(() => (card ? answerOptions(card, cards) : []), [card, cards])
  const correctKorean =
    card?.answers.find((a) => a.isRecommended)?.korean ?? card?.answers[0]?.korean

  const play = useCallback(
    async (rate = 1) => {
      if (!card) return
      setLoadingAudio(true)
      setError("")
      try {
        const url = await getCachedAudioUrl(card.question.korean)
        const audio = new Audio(url)
        audio.playbackRate = rate
        await audio.play()
      } catch {
        setError("Could not play audio. Check your connection and try again.")
      } finally {
        setLoadingAudio(false)
      }
    },
    [card],
  )

  async function choose(answer: PhraseAnswerContent) {
    if (selected || !card) return
    setSelected(answer.korean)
    setSaving(true)
    try {
      await phrasebookApi.recordAttempt({
        phraseId: card.id,
        practiceMode: "listen",
        inputMethod: "text",
        transcript: answer.korean,
        transcriptRevealed: revealed,
        taskCompleted: true,
      })
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this attempt."))
    } finally {
      setSaving(false)
    }
  }

  function next() {
    if (index + 1 >= cards.length) {
      onExhausted()
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
    setSelected(null)
    setError("")
  }

  if (!card) return null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>{situationLabel(card.situation)}</span>
      </div>

      <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-b-[6px] border-border bg-card p-6 text-center dark:bg-slate-900/60 sm:p-8">
        <span className="rounded-full bg-accent/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Listen &amp; respond
        </span>
        <button
          type="button"
          onClick={() => void play()}
          disabled={loadingAudio}
          aria-label="Play the question in Korean"
          className="flex h-28 w-28 items-center justify-center rounded-3xl border-b-4 border-[#1499e0] bg-[#1cb0f6] text-white shadow-lg shadow-[#1cb0f6]/30 transition-all active:translate-y-[3px] active:border-b-0 disabled:opacity-60"
        >
          {loadingAudio ? <Loader2 size={40} className="animate-spin" /> : <Volume2 size={44} />}
        </button>
        <div className="flex gap-2">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => void play(speed)}
              className="flex items-center gap-1.5 rounded-full border-2 border-b-4 border-border bg-accent/5 px-3 py-1.5 text-xs font-bold text-muted-foreground/70 transition-all active:translate-y-[2px] active:border-b-2 hover:text-foreground"
            >
              <Gauge size={12} /> {speed}×
            </button>
          ))}
        </div>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground underline decoration-dashed underline-offset-4 hover:text-foreground"
          >
            <Eye size={13} /> Reveal Korean text (doesn&apos;t complete this exercise)
          </button>
        ) : (
          <p className="break-keep text-lg font-bold text-foreground [overflow-wrap:anywhere]">
            {card.question.korean}
          </p>
        )}
      </div>

      {error && <p className="text-center text-xs font-semibold text-destructive">{error}</p>}

      <div className="space-y-2.5">
        <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Choose the appropriate answer
        </p>
        {options.map((option, i) => {
          const isCorrect = option.korean === correctKorean
          const isSelected = option.korean === selected
          const answered = selected !== null
          return (
            <button
              key={i}
              type="button"
              disabled={answered || saving}
              onClick={() => choose(option)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                !answered
                  ? "border-border bg-card hover:border-blue-500/40"
                  : isCorrect
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isSelected
                      ? "border-red-500 bg-red-500/10"
                      : "border-border/40 bg-accent/5 opacity-50",
              )}
            >
              <span className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere]">
                {option.korean}
              </span>
              {answered && isCorrect && (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              )}
              {answered && isSelected && !isCorrect && (
                <XCircle size={18} className="shrink-0 text-red-600" />
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <Button className="h-14 w-full" onClick={next}>
          {index + 1 >= cards.length ? "Finish" : "Next"}{" "}
          <ChevronRight size={18} className="ml-1" />
        </Button>
      )}
    </div>
  )
}
