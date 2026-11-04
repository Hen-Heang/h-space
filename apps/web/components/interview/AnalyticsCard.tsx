"use client"

import { AudioLines, BookMarked, Info, Ruler, SpellCheck } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { InterviewAnalytics } from "@/lib/interview"

/**
 * Deeper end-of-session analysis from the structured evaluate route. Every
 * value is inferred from the speech-recognition transcript — there is no audio
 * analysis — so the card wears an "estimated" badge front and center.
 */
export function AnalyticsCard({ analytics }: { analytics: InterviewAnalytics }) {
  return (
    <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
      <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
              <AudioLines size={20} strokeWidth={2.5} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Speech Analysis</CardTitle>
              <p className="text-xs font-medium text-muted-foreground">
                How you spoke, beyond the four scores.
              </p>
            </div>
          </div>
          <Badge className="rounded-lg border-none bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Info size={12} className="mr-1" strokeWidth={2.5} />
            Estimated from transcript — no audio analysis
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5 sm:pt-6">
        {/* Delivery estimates */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-accent/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Ruler size={12} strokeWidth={2.5} /> Sentence length
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
              {analytics.avgSentenceLengthWords}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                words / sentence (avg)
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-accent/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <AudioLines size={12} strokeWidth={2.5} /> Fillers &amp; hesitation
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground/90">
              {analytics.fillerNotes}
            </p>
          </div>
        </div>

        {/* Vocabulary range */}
        {analytics.vocabRangeNotes && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Vocabulary range
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground/90">
              {analytics.vocabRangeNotes}
            </p>
          </div>
        )}

        {/* Grammar issues */}
        {analytics.grammarIssues.length > 0 && (
          <section>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <SpellCheck size={13} strokeWidth={2.5} /> Grammar to fix
            </p>
            <div className="mt-3 space-y-2">
              {analytics.grammarIssues.map((issue, i) => (
                <div key={i} className="rounded-2xl border border-border bg-accent/5 px-4 py-3">
                  <p className="text-sm font-bold text-foreground">{issue.issue}</p>
                  {issue.example && (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      ✗ {issue.example}
                    </p>
                  )}
                  {issue.fix && (
                    <p className="mt-0.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ {issue.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Words to practice */}
        {analytics.wordsToPractice.length > 0 && (
          <section>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <BookMarked size={13} strokeWidth={2.5} /> Words to practice
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analytics.wordsToPractice.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-accent/5 py-1 pl-3 pr-1 text-sm font-bold text-foreground"
                >
                  {word}
                  <SpeakButton text={word} className="p-1" />
                </span>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
