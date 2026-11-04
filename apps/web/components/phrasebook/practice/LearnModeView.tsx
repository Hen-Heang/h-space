"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { PhraseRegisterBadge } from "@/components/phrasebook/PhraseRegisterBadge"
import { RevealText } from "@/components/phrasebook/RevealText"
import { cn } from "@/lib/utils"
import type { PhraseCardWithProgress } from "@/lib/types"
import type { RomanizationMode } from "@/lib/korean-coach/schemas"

interface LearnModeViewProps {
  /** Called from the last card's Finish button, so Learn reaches the completion screen. */
  onExhausted: () => void
  cards: PhraseCardWithProgress[]
  romanizationPreference: RomanizationMode
}

export function LearnModeView({ cards, romanizationPreference, onExhausted }: LearnModeViewProps) {
  const [index, setIndex] = useState(0)
  const card = cards[index]
  if (!card) return null

  const romanizationVisible = romanizationPreference === "always"
  const recommended = card.answers.filter((a) => a.isRecommended)
  const alternatives = card.answers.filter((a) => !a.isRecommended)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>{card.situation}</span>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PhraseRegisterBadge register={card.question.register} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <p
            lang="ko"
            className="break-keep text-2xl font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-3xl"
          >
            {card.question.korean}
          </p>
          <SpeakButton
            text={card.question.korean}
            className="mt-1 shrink-0 bg-accent/10"
            title="Listen to the question"
          />
        </div>
        {romanizationPreference !== "never" && (
          <RevealText
            label="romanization"
            value={card.question.romanization}
            initiallyVisible={romanizationVisible}
            textClassName="mt-2 text-base font-medium italic text-muted-foreground"
          />
        )}
        <RevealText
          label="English"
          value={card.question.english}
          initiallyVisible={false}
          textClassName="mt-2 text-base text-muted-foreground"
          className="mt-2"
        />

        {card.questionVariants.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-border/60 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
              Similar ways to ask
            </p>
            {card.questionVariants.map((variant) => (
              <div key={variant} className="flex items-center gap-2">
                <p lang="ko" className="text-sm font-medium text-foreground">
                  {variant}
                </p>
                <SpeakButton
                  text={variant}
                  className="h-6 w-6 bg-transparent"
                  title={`Listen: ${variant}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
            Answers
          </p>
          {[...recommended, ...alternatives].map((answer, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-3",
                answer.isRecommended
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : "border-border bg-accent/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    lang="ko"
                    className="break-keep font-semibold text-foreground [overflow-wrap:anywhere]"
                  >
                    {answer.korean}
                  </p>
                  {romanizationPreference !== "never" && (
                    <RevealText
                      label="romanization"
                      value={answer.romanization}
                      initiallyVisible={romanizationVisible}
                      textClassName="mt-0.5 text-sm italic text-muted-foreground"
                    />
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{answer.english}</p>
                  {answer.usageNote && (
                    <p className="mt-1 text-xs text-muted-foreground/80">{answer.usageNote}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {answer.isRecommended && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                      Recommended
                    </span>
                  )}
                  <SpeakButton
                    text={answer.korean}
                    className="bg-transparent"
                    title={`Listen: ${answer.korean}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {card.usageNote && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Usage note
            </p>
            <p className="mt-1 text-sm text-foreground">{card.usageNote}</p>
          </div>
        )}

        {card.vocabulary.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
              Vocabulary
            </p>
            <div className="flex flex-wrap gap-2">
              {card.vocabulary.map((v) => (
                <span
                  key={v.korean}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  <span lang="ko" className="font-bold">
                    {v.korean}
                  </span>{" "}
                  — {v.english}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft size={16} className="mr-1" /> Previous
        </Button>
        {index === cards.length - 1 ? (
          <Button onClick={onExhausted}>
            Finish <ChevronRight aria-hidden="true" size={16} className="ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}>
            Next <ChevronRight aria-hidden="true" size={16} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
