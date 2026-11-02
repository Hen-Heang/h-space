"use client"

import { BookOpen, Languages, MessageSquareQuote, SpellCheck } from "lucide-react"
import { motion } from "motion/react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Card, CardContent } from "@/components/ui/card"
import type { PracticeQuestion } from "@/lib/answer-practice"

/**
 * Self-review without an AI check: what was asked (with replay), the English
 * when allowed, the bank's model answer or the AI question's word notes and
 * grammar note, and the learner's own answer side by side. Formerly
 * ListeningRevealCard.
 */
export function CompareReviewCard({
  question,
  showEnglish,
  userAnswer,
}: {
  question: PracticeQuestion
  /** Off in the listening exam level ("no English anywhere"). */
  showEnglish: boolean
  userAnswer?: string
}) {
  const glosses = question.glosses ?? []
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">What was asked</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p
                lang="ko"
                className="break-keep text-xl font-semibold leading-snug text-foreground sm:text-2xl"
              >
                {question.ko}
              </p>
              <SpeakButton text={question.ko} className="mt-1 shrink-0 p-1.5" />
            </div>
            {showEnglish && question.en && (
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
                <Languages aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {question.en}
              </p>
            )}
          </div>

          {userAnswer ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MessageSquareQuote aria-hidden="true" className="size-3.5" /> Your answer
              </p>
              <p lang="ko" className="mt-1.5 break-keep text-base leading-relaxed text-foreground">
                {userAnswer}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You revealed without answering — say an answer out loud now, then try again.
            </p>
          )}

          {question.sampleAnswerKo && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-primary">Model answer from your bank</p>
                <SpeakButton text={question.sampleAnswerKo} className="shrink-0 p-1" />
              </div>
              <p lang="ko" className="mt-1.5 break-keep text-base leading-relaxed text-foreground">
                {question.sampleAnswerKo}
              </p>
              {showEnglish && question.sampleAnswerEn && (
                <p className="mt-1.5 text-sm text-muted-foreground">{question.sampleAnswerEn}</p>
              )}
            </div>
          )}

          {glosses.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <BookOpen aria-hidden="true" className="size-3.5" /> Words to know
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {glosses.map((gloss) => (
                  <span
                    key={gloss.term}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background py-1 pl-3 pr-1 text-sm font-semibold text-foreground"
                  >
                    <span lang="ko">{gloss.term}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {gloss.meaning}
                    </span>
                    <SpeakButton text={gloss.term} className="p-1" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {question.grammarNote && (
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-4">
              <SpellCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-foreground/90">{question.grammarNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
