"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Flag,
  ListTodo,
  Play,
  Target,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Goal } from "@/lib/goals"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import type { GoalPlanPhase } from "@/lib/goal-plan-phases"
import { keyResultProgress } from "@/lib/goal-progress"
import { selectNextBestAction } from "@/lib/next-best-action"
import { CAPACITY_STATUS_LABELS, summarizeWeek } from "@/lib/weekly-capacity"
import { getTaskDateKey } from "@/lib/calendar"
import { cn } from "@/lib/utils"

interface OverviewTabProps {
  goal: Goal
  tasks: Task[]
  keyResults: GoalKeyResult[]
  phases: GoalPlanPhase[]
  todayYmd: string
  onToggleTask: (taskId: string, completed: boolean) => void
  onScheduleTask: (task: Task) => void
  onOpenSchedule: () => void
  onOpenPlan: () => void
}

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return "0m"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

export function OverviewTab({
  goal,
  tasks,
  keyResults,
  phases,
  todayYmd,
  onToggleTask,
  onScheduleTask,
  onOpenSchedule,
  onOpenPlan,
}: OverviewTabProps) {
  const nextAction = useMemo(
    () => selectNextBestAction({ tasks, keyResults, phases, todayYmd }),
    [tasks, keyResults, phases, todayYmd],
  )

  const week = useMemo(
    () => summarizeWeek(tasks, { todayYmd, capacityMinutes: goal.weekly_capacity_minutes }),
    [tasks, todayYmd, goal.weekly_capacity_minutes],
  )

  const topKeyResults = useMemo(
    () => keyResults.filter((kr) => kr.status === "active").slice(0, 3),
    [keyResults],
  )

  const recentCompleted = useMemo(
    () =>
      tasks
        .filter((t) => t.completed && t.updated_at)
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        .slice(0, 3),
    [tasks],
  )

  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* ── Next Best Action ─────────────────────────────────────────────── */}
      <Card className="rounded-xl border-border p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next best action
          </h2>
        </div>

        {nextAction ? (
          <div className="mt-3 space-y-3">
            <p className="text-base font-semibold leading-snug text-foreground">
              {nextAction.task.title || nextAction.task.description || "Untitled task"}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {nextAction.effortMinutes > 0
                  ? formatMinutes(nextAction.effortMinutes)
                  : "No estimate"}
              </span>
              {nextAction.keyResult && (
                <span className="inline-flex items-center gap-1">
                  <Target size={12} /> {nextAction.keyResult.title}
                </span>
              )}
              {nextAction.phase && (
                <span className="inline-flex items-center gap-1">
                  <Flag size={12} /> {nextAction.phase.title}
                </span>
              )}
              {!nextAction.isScheduled && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                  Not scheduled
                </span>
              )}
            </div>
            <p className="text-xs font-medium leading-relaxed text-muted-foreground">
              {nextAction.reason}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onToggleTask(nextAction.task.id, nextAction.task.completed)}
                className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
              >
                <Check className="h-4 w-4" /> Mark done
              </Button>
              <Button
                variant="outline"
                onClick={() => onScheduleTask(nextAction.task)}
                className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
              >
                <CalendarClock className="h-4 w-4" />
                {nextAction.isScheduled ? "Reschedule" : "Schedule"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Nothing open right now. Add tasks in the Plan tab to get a next action.
            </p>
            <Button
              variant="outline"
              onClick={onOpenPlan}
              className="h-10 min-h-11 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
            >
              Open plan
            </Button>
          </div>
        )}
      </Card>

      {/* ── This week ────────────────────────────────────────────────────── */}
      <Card className="rounded-xl border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This week
          </h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              week.status === "over_capacity"
                ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                : week.status === "nearly_full"
                  ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : week.status === "healthy"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-foreground/5 text-muted-foreground",
            )}
          >
            {CAPACITY_STATUS_LABELS[week.status]}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Stat label="Sessions planned" value={String(week.plannedSessions)} />
          <Stat label="Sessions done" value={String(week.completedSessions)} />
          <Stat label="Minutes planned" value={formatMinutes(week.plannedMinutes)} />
          <Stat label="Minutes done" value={formatMinutes(week.completedMinutes)} />
          <Stat
            label={week.status === "over_capacity" ? "Over capacity by" : "Capacity left"}
            value={
              week.capacityMinutes == null
                ? "—"
                : formatMinutes(
                    week.status === "over_capacity" ? week.overMinutes : week.remainingMinutes,
                  )
            }
          />
          <Stat label="Unscheduled" value={String(week.unscheduledCount)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onOpenSchedule}
            className="h-10 min-h-11 gap-1.5 rounded-xl px-3.5 text-xs font-semibold sm:min-h-0"
          >
            <ListTodo className="h-4 w-4" /> Open schedule
          </Button>
        </div>
      </Card>

      {/* ── Key results summary ──────────────────────────────────────────── */}
      <Card className="rounded-xl border-border p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key results
        </h2>
        {topKeyResults.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No key results yet — the progress bar above is task activity, not outcome. Add one in
            the Plan tab.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {topKeyResults.map((kr) => {
              const pct = keyResultProgress(kr)
              return (
                <li key={kr.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
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
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ── Goal details (collapsed by default) ──────────────────────────── */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card className="rounded-xl border-border p-0">
          <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent/50 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Goal details
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                detailsOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <dl className="space-y-3 border-t border-border/60 px-4 py-4 sm:px-5">
              <Detail label="Why it matters" value={goal.motivation} />
              <Detail label="Outcome statement" value={goal.outcome_statement} />
              <Detail label="Success looks like" value={goal.success_definition} />
              <Detail label="Baseline" value={goal.baseline_summary} />
              <Detail label="Description" value={goal.description} />
              <Detail
                label="Dates"
                value={[
                  goal.metadata?.start_date
                    ? `Starts ${format(new Date(goal.metadata.start_date), "MMM d, yyyy")}`
                    : null,
                  goal.target_date
                    ? `Targets ${format(new Date(goal.target_date), "MMM d, yyyy")}`
                    : "No target date",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Detail label="Review cadence" value={goal.review_frequency ?? "Not set"} />
              <Detail
                label="Weekly capacity"
                value={
                  goal.weekly_capacity_minutes
                    ? formatMinutes(goal.weekly_capacity_minutes)
                    : "Not set"
                }
              />
            </dl>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Recent progress ──────────────────────────────────────────────── */}
      <Card className="rounded-xl border-border p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent progress
        </h2>
        {recentCompleted.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Nothing completed yet. Finish the next best action above to start the trail.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentCompleted.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-sm">
                <Check size={14} className="shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {t.title || t.description}
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {getTaskDateKey(t.updated_at) ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm leading-relaxed",
          value ? "text-foreground/85" : "italic text-muted-foreground",
        )}
      >
        {value || "Not set yet"}
      </dd>
    </div>
  )
}
