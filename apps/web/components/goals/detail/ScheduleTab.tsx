"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarPlus,
  Loader2,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiErrorMessage, goalsApi, scheduleRulesApi } from "@/lib/api"
import type { Goal } from "@/lib/goals"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import type { GoalPlanPhase } from "@/lib/goal-plan-phases"
import { describeRecurrence, type GoalScheduleRule } from "@/lib/goal-schedule-rules"
import {
  CAPACITY_STATUS_LABELS,
  findScheduleConflicts,
  isScheduled,
  summarizeWeek,
} from "@/lib/weekly-capacity"
import { parseYMD } from "@/lib/calendar"
import { cn } from "@/lib/utils"

import { ScheduleRuleDialog } from "./ScheduleRuleDialog"

const Calendar = dynamic(() => import("@/components/calendar/Calendar").then((m) => m.Calendar), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-muted/20" />,
})

interface ScheduleTabProps {
  goal: Goal
  goalId: string
  tasks: Task[]
  phases: GoalPlanPhase[]
  keyResults: GoalKeyResult[]
  rules: GoalScheduleRule[]
  rulesLoading: boolean
  todayYmd: string
  deepLinkTaskId?: string | null
  onRulesChanged: () => void
  onTasksChanged: () => void
  onGoalChanged: () => void
}

const formatMinutes = (m: number) =>
  m <= 0 ? "0m" : m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`

/**
 * Goal-scoped scheduling. The existing Calendar is reused for the time grid,
 * but the goal's own context — capacity, backlog, routines, conflicts — lives
 * beside it rather than being buried inside a nested card.
 */
export function ScheduleTab({
  goal,
  goalId,
  tasks,
  phases,
  keyResults,
  rules,
  rulesLoading,
  todayYmd,
  deepLinkTaskId,
  onRulesChanged,
  onTasksChanged,
  onGoalChanged,
}: ScheduleTabProps) {
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [capacityDraft, setCapacityDraft] = useState<string>(
    goal.weekly_capacity_minutes ? String(goal.weekly_capacity_minutes) : "",
  )
  const [savingCapacity, setSavingCapacity] = useState(false)

  const goalStartDate = goal.metadata?.start_date?.slice(0, 10) ?? null
  const goalTargetDate = goal.target_date

  const week = useMemo(
    () => summarizeWeek(tasks, { todayYmd, capacityMinutes: goal.weekly_capacity_minutes }),
    [tasks, todayYmd, goal.weekly_capacity_minutes],
  )
  const conflicts = useMemo(() => findScheduleConflicts(tasks), [tasks])
  const backlog = useMemo(() => tasks.filter((t) => !t.completed && !isScheduled(t)), [tasks])

  const saveCapacity = async () => {
    const minutes = capacityDraft.trim() === "" ? null : Number(capacityDraft)
    if (minutes != null && (!Number.isFinite(minutes) || minutes < 0)) {
      toast.error("Weekly capacity must be a positive number of minutes.")
      return
    }
    setSavingCapacity(true)
    try {
      await goalsApi.update(goalId, { weekly_capacity_minutes: minutes })
      onGoalChanged()
      toast.success("Weekly capacity saved")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save weekly capacity."))
    } finally {
      setSavingCapacity(false)
    }
  }

  const generate = async (rule: GoalScheduleRule) => {
    setGeneratingId(rule.id)
    try {
      const result = await scheduleRulesApi.generateOccurrences(rule, {
        goalStartDate,
        goalTargetDate,
      })
      onTasksChanged()
      if (result.created.length === 0) {
        toast.info("Nothing new to create", {
          description:
            result.occurrences.length === 0
              ? "This routine has no sessions in the next 14 days."
              : "Every session in the next 14 days already exists.",
        })
      } else {
        toast.success(
          `Created ${result.created.length} session${result.created.length === 1 ? "" : "s"}`,
          {
            description:
              result.skipped.length > 0 ? `${result.skipped.length} already existed.` : undefined,
          },
        )
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't create sessions from this routine."))
    } finally {
      setGeneratingId(null)
    }
  }

  const togglePause = async (rule: GoalScheduleRule) => {
    try {
      if (rule.active) await scheduleRulesApi.pause(rule.id)
      else await scheduleRulesApi.reactivate(rule.id)
      onRulesChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update this routine."))
    }
  }

  const removeRule = async (rule: GoalScheduleRule) => {
    try {
      await scheduleRulesApi.remove(rule.id)
      onRulesChanged()
      onTasksChanged()
      toast.success("Routine deleted", { description: "Sessions you already created were kept." })
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete this routine."))
    }
  }

  const sidePanel = (
    <div className="space-y-4">
      {/* Capacity */}
      <Card className="rounded-xl border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly capacity
          </h3>
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

        <p className="mt-2 text-sm font-medium text-foreground">
          {formatMinutes(week.plannedMinutes)} scheduled
          {week.capacityMinutes != null && ` of ${formatMinutes(week.capacityMinutes)}`}
        </p>
        {week.capacityMinutes != null && (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {week.status === "over_capacity"
              ? `${formatMinutes(week.overMinutes)} over — you can still schedule, but something will slip.`
              : `${formatMinutes(week.remainingMinutes)} left this week.`}
          </p>
        )}

        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="weekly-capacity" className="text-xs">
              Minutes per week
            </Label>
            <Input
              id="weekly-capacity"
              type="number"
              min={0}
              inputMode="numeric"
              value={capacityDraft}
              onChange={(e) => setCapacityDraft(e.target.value)}
              placeholder="e.g. 300"
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void saveCapacity()}
            disabled={savingCapacity}
            className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold"
          >
            {savingCapacity ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </Card>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card className="rounded-xl border-orange-500/30 bg-orange-500/[0.04] p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
            <AlertTriangle size={13} /> {conflicts.length} overlapping session
            {conflicts.length === 1 ? "" : "s"}
          </h3>
          <ul className="mt-2 space-y-1 text-xs font-medium text-muted-foreground">
            {conflicts.slice(0, 4).map((c, i) => (
              <li key={i} className="truncate">
                {c.date}: “{c.a.title}” ↔ “{c.b.title}”
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Backlog */}
      <Card className="rounded-xl border-border p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Unscheduled backlog
          <span className="ml-2 tabular-nums text-foreground">{backlog.length}</span>
        </h3>
        <ul className="mt-2.5 divide-y divide-border">
          {backlog.length === 0 && (
            <li className="text-xs font-medium text-muted-foreground">
              Everything open has a time slot.
            </li>
          )}
          {backlog.slice(0, 8).map((t) => (
            <li key={t.id} className="truncate py-2 text-sm font-medium text-foreground">
              {t.title || t.description || "Untitled task"}
            </li>
          ))}
          {backlog.length > 8 && (
            <li className="text-xs font-medium text-muted-foreground">
              +{backlog.length - 8} more
            </li>
          )}
        </ul>
      </Card>

      {/* Recurring rules */}
      <Card className="rounded-xl border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Repeat size={13} /> Routines
            {rulesLoading && <Loader2 size={12} className="animate-spin" />}
          </h3>
          <Button
            variant="outline"
            onClick={() => setRuleDialogOpen(true)}
            className="h-10 min-h-11 gap-1.5 rounded-xl px-3 text-xs font-semibold sm:min-h-0"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>

        <ul className="mt-3 divide-y divide-border">
          {rules.length === 0 && !rulesLoading && (
            <li className="text-xs font-medium text-muted-foreground">
              No routines yet. A routine turns “three times a week” into real sessions on demand.
            </li>
          )}
          {rules.map((rule) => (
            <li key={rule.id} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{rule.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {describeRecurrence(rule)}
                    {rule.start_time && ` · ${rule.start_time.slice(0, 5)}`}
                    {rule.duration_minutes && ` · ${rule.duration_minutes}m`}
                    {!rule.active && " · paused"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={rule.active ? `Pause ${rule.title}` : `Resume ${rule.title}`}
                    onClick={() => void togglePause(rule)}
                    className="h-11 w-11 rounded-lg sm:h-8 sm:w-8"
                  >
                    {rule.active ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${rule.title}`}
                    onClick={() => void removeRule(rule)}
                    className="h-11 w-11 rounded-lg text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                disabled={!rule.active || generatingId === rule.id}
                onClick={() => void generate(rule)}
                className="mt-2 h-10 min-h-11 w-full gap-1.5 rounded-lg text-xs font-semibold sm:min-h-0"
              >
                {generatingId === rule.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                Create next 14 days
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4 lg:space-y-0">
      <div className="order-2 h-[clamp(420px,70dvh,720px)] overflow-hidden rounded-xl border border-border lg:order-1">
        <Calendar
          goalId={goalId}
          goalTitle={goal.title}
          goalStartDate={parseYMD(goalStartDate) ?? undefined}
          goalTargetDate={parseYMD(goalTargetDate) ?? undefined}
          initialTaskId={deepLinkTaskId}
        />
      </div>
      <div className="order-1 lg:order-2">{sidePanel}</div>

      <ScheduleRuleDialog
        isOpen={ruleDialogOpen}
        goalId={goalId}
        phases={phases}
        keyResults={keyResults}
        goalStartDate={goalStartDate}
        goalTargetDate={goalTargetDate}
        todayYmd={todayYmd}
        onClose={() => setRuleDialogOpen(false)}
        onSaved={onRulesChanged}
      />
    </div>
  )
}
