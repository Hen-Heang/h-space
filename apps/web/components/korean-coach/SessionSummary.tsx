import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lightbulb,
  MessageSquare,
  Mic,
  Sparkles,
  Target,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getKoreanCoachScenario } from "@/lib/korean-coach/scenarios"
import type { KoreanScenario, KoreanSessionSummary } from "@/lib/korean-coach/schemas"

export function SessionSummary({
  summary,
  scenario,
}: {
  summary: KoreanSessionSummary
  scenario?: KoreanScenario | null
}) {
  const suggested = summary.suggestedNextScenarioId
    ? getKoreanCoachScenario(summary.suggestedNextScenarioId)
    : undefined

  return (
    <section aria-labelledby="session-summary" className="space-y-5">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Session complete
        </p>
        <h2 id="session-summary" className="mt-2 text-3xl font-semibold tracking-tight">
          Useful progress, kept simple
        </h2>
        {scenario && (
          <p className="mt-2 text-muted-foreground">
            {scenario.englishTitle} · <span lang="ko">{scenario.koreanTitle}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-3 text-center">
          <Clock3 className="mx-auto size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 font-mono text-lg font-semibold">
            {Math.max(1, Math.round(summary.durationSeconds / 60))}
          </p>
          <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">minutes</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3 text-center">
          <Mic className="mx-auto size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 font-mono text-lg font-semibold">{summary.speakingAttempts}</p>
          <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">attempts</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3 text-center">
          <MessageSquare className="mx-auto size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 font-mono text-lg font-semibold">{summary.completedTurns}</p>
          <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">turns</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Target className="size-4 text-primary" aria-hidden="true" />
              Main correction
            </p>
            <p className="mt-2 leading-7">
              {summary.mainCorrection || "No important correction was saved in this session."}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Strong point
            </p>
            <p className="mt-2 leading-7">
              {summary.strongPoint || "You completed focused Korean practice."}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Lightbulb className="size-4 text-primary" aria-hidden="true" />
              Recommended improvement
            </p>
            <p className="mt-2 leading-7">
              {summary.recommendedImprovement || "Repeat one useful sentence at a steady pace."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" aria-hidden="true" />
            New vocabulary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.newVocabulary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No new vocabulary was marked in this session.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary.newVocabulary.map((word) => (
                <Badge key={`${word.korean}-${word.meaning}`} variant="secondary">
                  <span lang="ko">{word.korean}</span> · {word.meaning}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {summary.mistakesSaved} mistake{summary.mistakesSaved === 1 ? "" : "s"} saved
          </p>
        </CardContent>
      </Card>

      {suggested && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Suggested next scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold" lang="ko">
              {suggested.koreanTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{suggested.englishTitle}</p>
            <Button asChild className="mt-4 w-full">
              <Link href={`/korean-coach/practice/${suggested.id}`}>
                Start next scenario <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild size="lg" variant="outline">
          <Link href="/korean-coach/mistakes">Review mistakes</Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/korean-coach">Back to Korean Coach</Link>
        </Button>
      </div>
    </section>
  )
}
