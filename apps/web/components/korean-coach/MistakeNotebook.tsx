"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpenCheck, Check, RotateCcw, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { KoreanCoachMistake } from "@/lib/api"
import { getKoreanCoachScenario } from "@/lib/korean-coach/scenarios"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

type TypeFilter = "all" | KoreanCoachMistake["type"]
type ScenarioFilter = "all" | "workplace" | "daily"
type MasteryFilter = "not-mastered" | "mastered" | "all"

interface MistakeNotebookProps {
  mistakes: KoreanCoachMistake[]
  onMasteredChange: (id: string, mastered: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onPracticeAgain: (id: string) => Promise<void>
}

export function MistakeNotebook({
  mistakes,
  onMasteredChange,
  onDelete,
  onPracticeAgain,
}: MistakeNotebookProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>("all")
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("not-mastered")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      mistakes.filter((mistake) => {
        if (typeFilter !== "all" && mistake.type !== typeFilter) return false
        if (scenarioFilter !== "all" && mistake.scenarioCategory !== scenarioFilter) return false
        if (masteryFilter === "mastered" && !mistake.mastered) return false
        if (masteryFilter === "not-mastered" && mistake.mastered) return false
        return true
      }),
    [masteryFilter, mistakes, scenarioFilter, typeFilter],
  )

  if (mistakes.length === 0) {
    return (
      <div data-testid="empty-mistake-notebook">
        <EmptyState
          surface
          icon={BookOpenCheck}
          title="No saved mistakes yet"
          description="Save a useful correction after a speaking attempt. Repeated patterns are merged and their count goes up."
          action={
            <Button asChild>
              <Link href="/korean-coach/scenarios">
                Start practice <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section aria-label="Mistake filters" className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "grammar", "vocabulary", "naturalness", "communication"] as const).map(
            (option) => (
              <button
                key={option}
                type="button"
                aria-pressed={typeFilter === option}
                onClick={() => setTypeFilter(option)}
                className={cn(
                  "min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  typeFilter === option
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {option === "all" ? "All errors" : option}
              </button>
            ),
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
            Scenario
            <select
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={scenarioFilter}
              onChange={(event) => setScenarioFilter(event.target.value as ScenarioFilter)}
            >
              <option value="all">All scenarios</option>
              <option value="workplace">Workplace Korean</option>
              <option value="daily">Daily Korean</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
            Status
            <select
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={masteryFilter}
              onChange={(event) => setMasteryFilter(event.target.value as MasteryFilter)}
            >
              <option value="not-mastered">Not mastered</option>
              <option value="mastered">Mastered</option>
              <option value="all">All statuses</option>
            </select>
          </label>
        </div>
      </section>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {mistakes.length} saved mistake
        {mistakes.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No mistakes match these filters</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-3"
            onClick={() => {
              setTypeFilter("all")
              setScenarioFilter("all")
              setMasteryFilter("all")
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((mistake) => {
            const scenario = mistake.scenarioId
              ? getKoreanCoachScenario(mistake.scenarioId)
              : undefined
            return (
              <li key={mistake.id}>
                <Card>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="capitalize">
                          {mistake.type}
                        </Badge>
                        <Badge variant={mistake.mastered ? "accent" : "secondary"}>
                          {mistake.mastered ? "Mastered" : "Not mastered"}
                        </Badge>
                        {mistake.occurrenceCount > 1 && (
                          <Badge variant="secondary">Seen ×{mistake.occurrenceCount}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mistake.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-destructive/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Original
                        </p>
                        <p
                          className="mt-2 text-lg line-through decoration-destructive/50"
                          lang="ko"
                        >
                          {mistake.original}
                        </p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Corrected
                        </p>
                        <p className="mt-2 text-lg font-semibold text-primary" lang="ko">
                          {mistake.correction}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Natural alternative
                      </p>
                      <p className="mt-2 font-medium" lang="ko">
                        {mistake.naturalAlternative}
                      </p>
                      {mistake.englishMeaning && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {mistake.englishMeaning}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Why
                      </p>
                      <p className="mt-2 text-sm leading-6">{mistake.explanation}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{scenario?.englishTitle ?? "Korean Coach"}</span>
                      <span>Review count: {mistake.reviewCount}</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Button
                        asChild
                        variant="outline"
                        onClick={() => void onPracticeAgain(mistake.id)}
                      >
                        <Link
                          href={
                            mistake.scenarioId
                              ? `/korean-coach/practice/${mistake.scenarioId}`
                              : "/korean-coach/scenarios"
                          }
                        >
                          <RotateCcw aria-hidden="true" />
                          Practise Again
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant={mistake.mastered ? "secondary" : "outline"}
                        disabled={busyId === mistake.id}
                        onClick={async () => {
                          setBusyId(mistake.id)
                          await onMasteredChange(mistake.id, !mistake.mastered)
                          setBusyId(null)
                        }}
                      >
                        <Check aria-hidden="true" />
                        {mistake.mastered ? "Mark not mastered" : "Mark mastered"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Delete saved mistake"
                          >
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this saved mistake?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the correction and its review history. It does not delete
                              the practice session.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void onDelete(mistake.id)}>
                              Delete mistake
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
