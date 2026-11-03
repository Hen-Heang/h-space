"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Flag,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useGoalTaskActions } from "@/hooks/useGoalTaskActions"
import { KeyResultsCard } from "@/components/goals/KeyResultsCard"
import { getApiErrorMessage, planPhasesApi } from "@/lib/api"
import type { Goal } from "@/lib/goals"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import {
  PHASE_STATUS_LABELS,
  sortPhases,
  type GoalPlanPhase,
  type LegacyMilestone,
  type PhaseDraft,
} from "@/lib/goal-plan-phases"
import { groupTasksForPlan, type TaskViewContext } from "@/lib/task-views"
import { cn } from "@/lib/utils"

import { PhaseDialog } from "./PhaseDialog"
import { GoalTaskDetailsSheet } from "./tasks/GoalTaskDetailsSheet"
import { GoalTaskRow, formatEffort } from "./tasks/GoalTaskRow"

interface PlanTabProps {
  goal: Goal
  goalId: string
  tasks: Task[]
  keyResults: GoalKeyResult[]
  phases: GoalPlanPhase[]
  phasesLoading: boolean
  todayYmd: string
  onPhasesChanged: () => void
  onKeyResultsChanged: () => void
  onTasksChanged: () => void
  onAddTask: (phaseId: string | null) => void
}

const phaseStatusStyle: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  archived: "bg-foreground/5 text-muted-foreground",
  planned: "bg-foreground/5 text-muted-foreground",
}

/**
 * Plan — the goal's structure: outcome → key results → ordered phases → tasks
 * grouped by the key result they serve → unassigned backlog.
 *
 * Triage across the whole goal (search, chips, filters, sorting) lives on its
 * own route, `/goals/[id]/tasks`, so its filter state can live in the URL.
 * Both surfaces share the same task model (`lib/task-views.ts`) and the same
 * actions (`useGoalTaskActions`), so a task behaves identically in either.
 *
 * Reordering uses accessible Move up / Move down rather than drag-and-drop:
 * no DnD library is installed, and phase lists are short. See
 * docs/goal-planning-scheduling-audit.md.
 */
export function PlanTab({
  goal,
  goalId,
  tasks,
  keyResults,
  phases,
  phasesLoading,
  todayYmd,
  onPhasesChanged,
  onKeyResultsChanged,
  onTasksChanged,
  onAddTask,
}: PlanTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<GoalPlanPhase | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const actions = useGoalTaskActions({ todayYmd, onChanged: onTasksChanged })

  const ordered = useMemo(() => sortPhases(phases), [phases])
  const visiblePhases = useMemo(() => ordered.filter((p) => p.status !== "archived"), [ordered])

  const context: TaskViewContext = useMemo(
    () => ({ todayYmd, phases: ordered, keyResults }),
    [todayYmd, ordered, keyResults],
  )

  const groups = useMemo(() => groupTasksForPlan(tasks, context), [tasks, context])
  const openTask = useMemo(
    () => tasks.find((t) => t.id === openTaskId) ?? null,
    [tasks, openTaskId],
  )

  const legacyMilestones = (goal.metadata?.milestones ?? []) as LegacyMilestone[]

  const move = async (phase: GoalPlanPhase, direction: "up" | "down") => {
    setMovingId(phase.id)
    try {
      await planPhasesApi.move(ordered, phase.id, direction)
      onPhasesChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't reorder the phases."))
    } finally {
      setMovingId(null)
    }
  }

  const setPhaseStatus = async (phase: GoalPlanPhase, status: GoalPlanPhase["status"]) => {
    try {
      await planPhasesApi.setStatus(phase.id, status)
      onPhasesChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update the phase status."))
    }
  }

  const rowProps = (task: Task, phase: GoalPlanPhase | null) => ({
    task,
    todayYmd,
    phase,
    keyResult: keyResults.find((kr) => kr.id === task.key_result_id) ?? null,
    isSelected: openTaskId === task.id,
    showPhase: false,
    onToggleCompleted: actions.toggleCompleted,
    onOpen: (t: Task) => setOpenTaskId(t.id),
    onSetStatus: (t: Task, status: Task["status"]) => status && void actions.setStatus(t, status),
    onSchedule: (t: Task) => setOpenTaskId(t.id),
    onMoveToBacklog: (t: Task) => void actions.moveToBacklog(t),
    onDelete: (t: Task) => void actions.remove(t),
  })

  return (
    <div className="space-y-4">
      {/* Outcome line — what every phase and task is in service of. */}
      <Card className="rounded-xl border-border p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Outcome
        </h2>
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            goal.outcome_statement ? "text-foreground" : "italic text-muted-foreground",
          )}
        >
          {goal.outcome_statement ||
            goal.description ||
            "No outcome statement yet — edit the goal to say what success actually looks like."}
        </p>
      </Card>

      <KeyResultsCard goalId={goalId} keyResults={keyResults} onChanged={onKeyResultsChanged} />

      {legacyMilestones.length > 0 && (
        <MilestoneConversionCard
          goal={goal}
          goalId={goalId}
          milestones={legacyMilestones}
          onConverted={onPhasesChanged}
        />
      )}

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Flag size={13} strokeWidth={2.5} /> Phases
          {phasesLoading && <Loader2 size={12} className="animate-spin" />}
        </h2>
        <Button
          variant="outline"
          onClick={() => {
            setEditingPhase(null)
            setDialogOpen(true)
          }}
          className="h-11 gap-1.5 rounded-xl px-3 text-xs font-semibold sm:h-9"
        >
          <Plus className="h-4 w-4" /> Add phase
        </Button>
      </div>

      {visiblePhases.length === 0 && !phasesLoading && (
        <Card className="rounded-xl border-dashed border-border p-5">
          <p className="text-sm font-medium text-muted-foreground">
            No phases yet. Break this goal into 3–5 ordered stages — each one gets its own tasks and
            its own finish line.
          </p>
        </Card>
      )}

      {groups.map((group) => {
        const phase = group.phase
        const index = phase ? visiblePhases.findIndex((p) => p.id === phase.id) : -1
        // An archived phase that still holds tasks appears here but isn't
        // in the reorderable list.
        if (phase && index === -1 && group.tasks.length === 0) return null

        return (
          <Card key={phase?.id ?? "backlog"} className="rounded-xl border-border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {phase ? (
                    <>
                      {index >= 0 && (
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      )}
                      <h3 className="min-w-0 text-sm font-semibold text-foreground">
                        {phase.title}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          phaseStatusStyle[phase.status],
                        )}
                      >
                        {PHASE_STATUS_LABELS[phase.status]}
                      </span>
                    </>
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground">Unassigned backlog</h3>
                  )}
                </div>

                {phase?.objective && (
                  <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                    {phase.objective}
                  </p>
                )}

                <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                  {phase &&
                    `${
                      phase.start_date || phase.end_date
                        ? `${phase.start_date ?? "—"} → ${phase.end_date ?? "—"}`
                        : "No dates"
                    } · `}
                  {group.completedCount}/{group.tasks.length} done
                  {group.effortMinutes > 0 && ` · ${formatEffort(group.effortMinutes)} planned`}
                  {group.unscheduledCount > 0 && ` · ${group.unscheduledCount} unscheduled`}
                </p>
              </div>

              {phase && index >= 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${phase.title} up`}
                    disabled={index === 0 || movingId === phase.id}
                    onClick={() => void move(phase, "up")}
                    className="h-11 w-11 rounded-xl sm:h-8 sm:w-8"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${phase.title} down`}
                    disabled={index === visiblePhases.length - 1 || movingId === phase.id}
                    onClick={() => void move(phase, "down")}
                    className="h-11 w-11 rounded-xl sm:h-8 sm:w-8"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${phase.title}`}
                    onClick={() => {
                      setEditingPhase(phase)
                      setDialogOpen(true)
                    }}
                    className="h-11 w-11 rounded-xl sm:h-8 sm:w-8"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tasks, grouped by the key result they serve. */}
            <div className="mt-3 space-y-3">
              {group.tasks.length === 0 && (
                <p className="text-xs font-medium text-muted-foreground">
                  {phase ? "No tasks in this phase yet." : "Every task belongs to a phase. Nice."}
                </p>
              )}

              {group.keyResultGroups.map((krGroup) => (
                <div key={krGroup.keyResult?.id ?? "unlinked"} className="space-y-1.5">
                  {group.keyResultGroups.length > 1 || krGroup.keyResult ? (
                    <p className="flex items-center gap-1.5 px-0.5 text-xs font-medium text-muted-foreground">
                      <Target size={11} className="shrink-0" />
                      <span className="min-w-0 truncate">
                        {krGroup.keyResult?.title ?? "No key result"}
                      </span>
                    </p>
                  ) : null}
                  <ul className="divide-y divide-border">
                    {krGroup.tasks.map((task) => (
                      <GoalTaskRow key={task.id} variant="card" {...rowProps(task, phase)} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => onAddTask(phase?.id ?? null)}
                className="h-11 gap-1.5 rounded-xl px-3 text-xs font-semibold sm:h-9"
              >
                <Plus className="h-4 w-4" />
                {phase ? "Task in this phase" : "Add task"}
              </Button>
              {phase && phase.status !== "active" && (
                <Button
                  variant="ghost"
                  onClick={() => void setPhaseStatus(phase, "active")}
                  className="h-11 rounded-xl px-3 text-xs font-semibold sm:h-9"
                >
                  Make active
                </Button>
              )}
              {phase && phase.status !== "archived" && (
                <Button
                  variant="ghost"
                  onClick={() => void setPhaseStatus(phase, "archived")}
                  className="h-11 rounded-xl px-3 text-xs font-semibold text-muted-foreground sm:h-9"
                >
                  Archive
                </Button>
              )}
            </div>
          </Card>
        )
      })}

      <PhaseDialog
        isOpen={dialogOpen}
        goalId={goalId}
        phase={editingPhase}
        goalStartDate={goal.metadata?.start_date?.slice(0, 10) ?? null}
        goalTargetDate={goal.target_date}
        onClose={() => setDialogOpen(false)}
        onSaved={onPhasesChanged}
      />

      <GoalTaskDetailsSheet
        task={openTask}
        todayYmd={todayYmd}
        phases={visiblePhases}
        keyResults={keyResults}
        actions={actions}
        goalStartDate={goal.metadata?.start_date?.slice(0, 10) ?? null}
        goalTargetDate={goal.target_date}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}

/**
 * Non-destructive migration prompt for the legacy "Sub-goals" checklist
 * (goal.metadata.milestones). Shows the exact phases that would be created
 * before anything is written, and never clears the original metadata.
 */
function MilestoneConversionCard({
  goal,
  goalId,
  milestones,
  onConverted,
}: {
  goal: Goal
  goalId: string
  milestones: LegacyMilestone[]
  onConverted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const drafts: PhaseDraft[] = useMemo(
    () =>
      planPhasesApi.previewMilestoneConversion(milestones, {
        goalStartDate: goal.metadata?.start_date ?? null,
        goalTargetDate: goal.target_date,
      }),
    [milestones, goal.metadata?.start_date, goal.target_date],
  )

  const convert = async () => {
    setSaving(true)
    try {
      await planPhasesApi.convertMilestones(goalId, drafts)
      onConverted()
      setOpen(false)
      toast.success(`Created ${drafts.length} phase${drafts.length === 1 ? "" : "s"}`, {
        description: "Your original checkpoints were kept as-is.",
      })
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't convert your checkpoints."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-xl border-primary/30 bg-primary/[0.03] p-0">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left sm:px-5">
          <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles size={13} className="text-primary" />
            Convert {milestones.length} existing checkpoint
            {milestones.length === 1 ? "" : "s"} into plan phases
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-primary/20 px-4 py-4 sm:px-5">
            <p className="text-xs font-medium leading-relaxed text-muted-foreground">
              Preview only — nothing is saved until you confirm, and your original checkpoint list
              is kept untouched either way.
            </p>
            <ul className="divide-y divide-border">
              {drafts.map((d, i) => (
                <li key={`${d.title}-${i}`} className="flex items-center gap-2 py-2 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {d.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.start_date ?? "—"} → {d.end_date ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => void convert()}
              disabled={saving || drafts.length === 0}
              className="h-11 rounded-xl px-4 text-xs font-semibold"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {drafts.length} phase{drafts.length === 1 ? "" : "s"}
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
