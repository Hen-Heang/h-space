"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Clock3, Coffee, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KOREAN_COACH_SCENARIOS } from "@/lib/korean-coach/scenarios"
import type { KoreanScenarioCategory } from "@/lib/korean-coach/schemas"
import { cn } from "@/lib/utils"
import { useSessionTimer } from "@/hooks/useSessionTimer"

type ScenarioFilter = "all" | KoreanScenarioCategory

export default function KoreanCoachScenariosPage() {
  useSessionTimer("korean_coach")
  const [filter, setFilter] = useState<ScenarioFilter>("all")
  const scenarios = useMemo(
    () =>
      filter === "all"
        ? KOREAN_COACH_SCENARIOS
        : KOREAN_COACH_SCENARIOS.filter((scenario) => scenario.category === filter),
    [filter],
  )

  return (
    <div className="space-y-6 pb-14">
      <header>
        <Button asChild variant="ghost" className="-ml-3 mb-3">
          <Link href="/korean-coach">
            <ArrowLeft aria-hidden="true" />
            Korean Coach
          </Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Scenario practice
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          What do you need to say?
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Choose one focused situation. The coach will speak first, keep the transcript hidden, and
          ask only one short question at a time.
        </p>
      </header>

      <div
        role="group"
        aria-label="Filter scenarios"
        className="grid grid-cols-3 rounded-xl border border-border bg-muted/35 p-1"
      >
        {(
          [
            { value: "all", label: "All" },
            { value: "workplace", label: "Workplace" },
            { value: "daily", label: "Daily life" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "min-h-11 rounded-lg px-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              filter === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"}
      </p>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Korean practice scenarios">
        {scenarios.map((scenario) => {
          const CategoryIcon = scenario.category === "workplace" ? BriefcaseBusiness : Coffee
          return (
            <Card key={scenario.id} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CategoryIcon aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant="outline">{scenario.difficulty}</Badge>
                    <Badge variant="secondary">
                      <Clock3 aria-hidden="true" />
                      {scenario.estimatedMinutes} min
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-2 text-xl" lang="ko">
                  {scenario.koreanTitle}
                </CardTitle>
                <p className="font-medium">{scenario.englishTitle}</p>
                <CardDescription className="leading-6">{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Target className="size-3.5" aria-hidden="true" />
                    You will practise
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {scenario.learningObjectives.slice(0, 2).map((objective) => (
                      <li key={objective} className="flex gap-2">
                        <span className="text-primary" aria-hidden="true">
                          ·
                        </span>
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.usefulVocabulary.slice(0, 3).map((word) => (
                    <Badge key={word.korean} variant="secondary" title={word.meaning}>
                      <span lang="ko">{word.korean}</span>
                    </Badge>
                  ))}
                </div>
                <Button asChild className="w-full">
                  <Link href={`/korean-coach/practice/${scenario.id}`}>
                    Start this scenario <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
