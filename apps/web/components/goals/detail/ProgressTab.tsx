"use client"

import dynamic from "next/dynamic"
import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LearningMetricCard } from "@/components/goals/LearningMetricCard"
import { evidenceApi, goalReviewsApi } from "@/lib/api"
import type { Goal } from "@/lib/goals"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import { keyResultProgress } from "@/lib/goal-progress"
import { cn } from "@/lib/utils"

const SmartAnalytics = dynamic(
  () => import("@/components/goals/SmartAnalytics").then((m) => m.SmartAnalytics),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-muted/20" />,
  },
)

interface ProgressTabProps {
  goal: Goal
  goalId: string
  tasks: Task[]
  keyResults: GoalKeyResult[]
  outcomeProgress: number | null
  activityProgress: { total: number; completed: number; percentage: number }
  onGoalUpdated: (goal: Goal) => void
}

/**
 * Progress tab — every backwards-looking view in one place, behind
 * progressive disclosure so the user isn't handed five cards at once.
 * Outcome is open by default; everything heavier stays collapsed (which also
 * keeps recharts out of the initial render).
 */
export function ProgressTab({
  goal,
  goalId,
  tasks,
  keyResults,
  outcomeProgress,
  activityProgress,
  onGoalUpdated,
}: ProgressTabProps) {
  const { data: evidence = [] } = useQuery({
    queryKey: ["goal", goalId, "evidence"],
    queryFn: () => evidenceApi.listForGoal(goalId),
    enabled: !!goalId,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ["goal", goalId, "reviews"],
    queryFn: () => goalReviewsApi.listForGoal(goalId),
    enabled: !!goalId,
  })

  const active = keyResults.filter((kr) => kr.status !== "archived")

  return (
    <div className="space-y-3">
      <Section title="Outcome" defaultOpen>
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {outcomeProgress != null ? `${outcomeProgress}%` : "—"}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {outcomeProgress != null
                ? "Weighted across active key results."
                : "No key results yet — add one in the Plan tab to measure the real outcome."}
            </p>
          </div>
          {active.length > 0 && (
            <ul className="space-y-2.5">
              {active.map((kr) => {
                const pct = keyResultProgress(kr)
                return (
                  <li key={kr.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {kr.title}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8"
                      role="progressbar"
                      aria-label={`${kr.title} progress`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Section>

      <Section title={`Evidence (${evidence.length})`}>
        {evidence.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            No evidence logged yet. Evidence is the proof a key result actually moved — a score, a
            merged PR, a recording.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {evidence.slice(0, 10).map((e) => (
              <li key={e.id} className="py-2.5">
                <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {e.evidence_type} · {e.created_at.slice(0, 10)}
                  {e.numeric_value != null && ` · ${e.numeric_value}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Reviews (${reviews.length})`}>
        {reviews.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            No reviews yet. A weekly review is where you decide what to change, not just what
            happened.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.slice(0, 5).map((r) => (
              <li key={r.id} className="py-2.5">
                <p className="text-xs font-semibold text-foreground">
                  {r.review_period_start.slice(0, 10)} → {r.review_period_end.slice(0, 10)}
                </p>
                {r.wins && (
                  <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                    {r.wins}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Activity">
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {activityProgress.completed}/{activityProgress.total}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Tasks completed ({activityProgress.percentage}%) — activity, not outcome.
            </p>
          </div>
          <LearningMetricCard goal={goal} onGoalUpdated={onGoalUpdated} />
        </div>
      </Section>

      <Section title="Analytics">
        <SmartAnalytics tasks={tasks} targetDate={goal.target_date} />
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-xl border-border p-0">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent/50 sm:px-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
