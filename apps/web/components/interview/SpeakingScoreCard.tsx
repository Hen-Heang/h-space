"use client"

import { Info, Lightbulb, MessageSquareQuote, SpellCheck } from "lucide-react"
import { motion } from "motion/react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { SpeakingCheckResponse } from "@/lib/api/interview"
import { SPEAKING_SCORE_KEYS, SPEAKING_SCORE_LABELS } from "@/lib/interview-drills"
import { cn } from "@/lib/utils"

/**
 * Per-answer result in the speaking drill: six 1–5 scores, coaching feedback,
 * the candidate's corrected answer, and a natural model answer. Scores are
 * inferred from the speech-recognition transcript — hence the estimated badge.
 */
export function SpeakingScoreCard({ result }: { result: SpeakingCheckResponse }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-[1.8rem] border-blue-500/30 bg-blue-500/5 shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Your score
            </p>
            <Badge className="rounded-lg border-none bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Info size={12} className="mr-1" />
              Estimated from transcript — no audio analysis
            </Badge>
          </div>

          {/* Six-score grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPEAKING_SCORE_KEYS.map((key) => {
              const score = result.scores[key]
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-border bg-background/60 px-3 py-2.5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {SPEAKING_SCORE_LABELS[key]}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xl font-bold tabular-nums",
                      score >= 4
                        ? "text-emerald-600 dark:text-emerald-400"
                        : score >= 3
                          ? "text-foreground"
                          : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {score}
                    <span className="text-xs font-medium text-muted-foreground"> / 5</span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* Feedback */}
          {result.feedback && (
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              {result.feedback}
            </p>
          )}

          {/* Corrected answer */}
          {result.correctedAnswer && (
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <SpellCheck size={12} /> Your answer, fixed
              </p>
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <p className="text-sm font-bold leading-relaxed text-foreground">
                  {result.correctedAnswer}
                </p>
                <SpeakButton text={result.correctedAnswer} className="mt-0.5 shrink-0 p-1.5" />
              </div>
            </div>
          )}

          {/* Model answer */}
          {result.betterAlternative && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <MessageSquareQuote size={12} /> A natural way to say it
              </p>
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <p className="text-sm font-bold leading-relaxed text-foreground">
                  {result.betterAlternative}
                </p>
                <SpeakButton text={result.betterAlternative} className="mt-0.5 shrink-0 p-1.5" />
              </div>
            </div>
          )}

          {/* Tip */}
          {result.tip && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm font-medium leading-relaxed text-foreground/90">{result.tip}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
