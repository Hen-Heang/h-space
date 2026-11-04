"use client"

import { useCallback, useMemo, useState } from "react"
import { ArrowRight, BookmarkCheck, BookmarkPlus, Mic, RotateCcw, Square, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { vocabApi } from "@/lib/api"
import { compareRepeat, type RepeatComparison, type RepeatSentence } from "@/lib/repeat-drill"
import { cn } from "@/lib/utils"

type ShadowPracticeProps = {
  sentences: RepeatSentence[]
  onClose: () => void
}

const GRADE_META: Record<RepeatComparison["grade"], { label: string; className: string }> = {
  perfect: {
    label: "Perfect",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  good: { label: "Good", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  retry: { label: "Try again", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
}

export function ShadowPractice({ sentences, onClose }: ShadowPracticeProps) {
  const [index, setIndex] = useState(0)
  const [comparison, setComparison] = useState<RepeatComparison | null>(null)
  const [saved, setSaved] = useState(false)

  const current = sentences[index]

  const handleResult = useCallback(
    (transcript: string) => {
      if (transcript.trim()) setComparison(compareRepeat(current.ko, transcript))
    },
    [current.ko],
  )

  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: false, onResult: handleResult })

  const reset = useCallback(() => {
    setComparison(null)
    speech.reset()
  }, [speech])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % sentences.length)
    setComparison(null)
    setSaved(false)
    speech.reset()
  }, [sentences.length, speech])

  const saveSentence = useCallback(async () => {
    try {
      await vocabApi.save({ category: "Shadowing", term: current.ko, meaning: current.en ?? "" })
      setSaved(true)
      toast.success("Saved to your vocabulary")
    } catch {
      toast.error("Could not save this sentence")
    }
  }, [current])

  const listening = speech.status === "listening"

  const markedWords = useMemo(() => comparison?.marks ?? [], [comparison])

  return (
    <section
      className="fixed inset-0 z-[9998] flex h-[100dvh] flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Repeat and shadow practice"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-500/12 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Repeat & shadow
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {index + 1} / {sentences.length}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close shadowing"
          className="h-11 w-11 rounded-lg text-muted-foreground"
        >
          <X size={20} />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6">
        <div className="w-full max-w-lg space-y-5">
          <p className="text-xs font-semibold text-muted-foreground">{current.sourceLabel}</p>

          {/* Target sentence — colored by hit/miss once a comparison exists. */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-5">
            <p
              className="text-[1.35rem] font-bold leading-relaxed tracking-tight text-foreground sm:text-[1.6rem]"
              lang="ko"
            >
              {comparison
                ? markedWords.map((mark, i) => (
                    <span
                      key={i}
                      className={cn(
                        mark.hit
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500/80 line-through decoration-1",
                      )}
                    >
                      {mark.word}
                      {i < markedWords.length - 1 ? " " : ""}
                    </span>
                  ))
                : current.ko}
            </p>
            {current.en && <p className="mt-2 text-xs text-muted-foreground">{current.en}</p>}

            <div className="mt-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1.5 text-xs font-bold text-foreground">
                <SpeakButton text={current.ko} title="Play at natural speed" />
                Natural
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1.5 text-xs font-bold text-foreground">
                <SpeakButton text={current.ko} playbackRate={0.6} title="Play slowly" />
                Slow
              </span>
            </div>
          </div>

          {/* What the recognizer heard. */}
          {(speech.transcript || listening) && (
            <div className="rounded-2xl border border-border/50 bg-background px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                You said
              </p>
              <p className="mt-1 min-h-6 text-base font-medium text-foreground" lang="ko">
                {speech.transcript || (listening ? "듣고 있어요…" : "")}
              </p>
            </div>
          )}

          {comparison && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    GRADE_META[comparison.grade].className,
                  )}
                >
                  {GRADE_META[comparison.grade].label}
                </span>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {comparison.wordAccuracy}%
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      words recognized
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{comparison.similarity}%</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      text match
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Based on speech-to-text — a rough guide to which words came through, not a
                pronunciation score.
              </p>
            </div>
          )}

          {speech.error && <p className="text-center text-xs text-rose-500">{speech.error}</p>}
          {!speech.supported && (
            <p className="text-center text-xs text-muted-foreground">
              Speech recognition isn&apos;t available in this browser — you can still listen and
              repeat aloud.
            </p>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/50 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={saveSentence}
            disabled={saved}
            aria-label="Save sentence"
            className="h-12 w-12 shrink-0 rounded-2xl"
          >
            {saved ? (
              <BookmarkCheck size={18} className="text-emerald-500" />
            ) : (
              <BookmarkPlus size={18} />
            )}
          </Button>

          {comparison ? (
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="h-12 flex-1 gap-1.5 rounded-2xl text-xs font-bold"
            >
              <RotateCcw size={16} />
              Retry
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => (listening ? speech.stop() : speech.start())}
              disabled={!speech.supported}
              className={cn(
                "h-12 flex-1 gap-1.5 rounded-2xl text-xs font-bold text-white",
                listening ? "bg-rose-500 hover:bg-rose-400" : "bg-blue-600 hover:bg-blue-500",
              )}
            >
              {listening ? <Square size={16} /> : <Mic size={16} />}
              {listening ? "Stop" : "Record"}
            </Button>
          )}

          <Button
            type="button"
            onClick={goNext}
            className="h-12 flex-1 gap-1.5 rounded-2xl bg-foreground text-xs font-bold text-background hover:opacity-90"
          >
            Next
            <ArrowRight size={16} />
          </Button>
        </div>
      </footer>
    </section>
  )
}
