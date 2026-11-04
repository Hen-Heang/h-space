"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/useMobile"
import type { GoalTaskActions } from "@/hooks/useGoalTaskActions"
import type { Task } from "@/lib/tasks"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import { addDaysYmd, type GoalPlanPhase } from "@/lib/goal-plan-phases"
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  isTaskOverdue,
  resolveTaskStatus,
  taskDueDate,
  taskScheduleDisplay,
} from "@/lib/task-status"
import { taskEffortMinutes } from "@/lib/weekly-capacity"
import { parseYMD } from "@/lib/calendar"
import { cn } from "@/lib/utils"

interface GoalTaskDetailsSheetProps {
  task: Task | null
  todayYmd: string
  phases: GoalPlanPhase[]
  keyResults: GoalKeyResult[]
  actions: GoalTaskActions
  goalStartDate?: string | null
  goalTargetDate?: string | null
  onClose: () => void
}

/**
 * Task details and editing. A bottom sheet on mobile (thumb-reachable, and it
 * never traps its own content behind the keyboard) and a right-side panel on
 * desktop — the same component and the same actions either way.
 */
export function GoalTaskDetailsSheet({ task, ...rest }: GoalTaskDetailsSheetProps) {
  if (!task) return null
  // Keyed by task id so the draft fields below re-initialise from props when a
  // different task is opened — no state-syncing effect needed.
  return <TaskDetailsBody key={task.id} task={task} {...rest} />
}

function TaskDetailsBody({
  task,
  todayYmd,
  phases,
  keyResults,
  actions,
  goalStartDate,
  goalTargetDate,
  onClose,
}: Omit<GoalTaskDetailsSheetProps, "task"> & { task: Task }) {
  const isMobile = useIsMobile()
  const [titleDraft, setTitleDraft] = useState(task.title ?? "")
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? "")
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason ?? "")
  const [effortDraft, setEffortDraft] = useState(() => {
    const effort = taskEffortMinutes(task)
    return effort > 0 ? String(effort) : ""
  })

  const status = resolveTaskStatus(task, todayYmd)
  const overdue = isTaskOverdue(task, todayYmd)
  // `due` backs the date input (raw YYYY-MM-DD); `schedule.label` is the
  // human-facing wording, shared with GoalTaskRow so the two can't disagree.
  const due = taskDueDate(task)
  const schedule = taskScheduleDisplay(task, todayYmd)
  const title = task.title || task.description || "Untitled task"

  const commitTitle = () => {
    const trimmed = titleDraft.trim()
    if (trimmed === (task.title ?? "")) return
    void actions.setDetails(task, { title: trimmed })
  }

  const commitDescription = () => {
    if (descriptionDraft === task.description) return
    void actions.setDetails(task, { description: descriptionDraft })
  }

  const setDate = (value: string) => {
    const parsed = parseYMD(value)
    if (!parsed) return
    const iso = parsed.toISOString()
    // A date change on an overdue task is a reschedule — that's the only path
    // that bumps reschedule_count (see lib/api/goals.ts).
    const patch = { start_date: iso, end_date: iso }
    void (overdue ? actions.reschedule(task, patch) : actions.schedule(task, patch))
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "max-h-[85dvh] rounded-t-2xl" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="pr-8 text-base leading-snug">{title}</SheetTitle>
          <SheetDescription className="text-xs">
            {overdue ? "Overdue · " : ""}
            {TASK_STATUS_LABELS[status]}
            {` · ${schedule.label}`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              placeholder="Task title"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={commitDescription}
              placeholder="Add more detail…"
              className="min-h-20 rounded-xl"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => void actions.setStatus(task, s, blockedReason)}
                  className={cn(
                    "h-11 rounded-xl border px-3 text-xs font-semibold transition-colors",
                    status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {TASK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>

          {status === "blocked" && (
            <div className="space-y-1.5">
              <Label htmlFor="task-blocked-reason">What&apos;s blocking it?</Label>
              <Input
                id="task-blocked-reason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                onBlur={() => void actions.setStatus(task, "blocked", blockedReason)}
                placeholder="e.g. waiting on review feedback"
                className="h-11 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-date">Scheduled date</Label>
            <Input
              id="task-date"
              type="date"
              value={due ?? ""}
              min={goalStartDate ?? undefined}
              max={goalTargetDate ?? undefined}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button
                variant="outline"
                onClick={() => setDate(todayYmd)}
                className="h-11 rounded-xl px-3 text-xs font-semibold"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => setDate(addDaysYmd(todayYmd, 1))}
                className="h-11 rounded-xl px-3 text-xs font-semibold"
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                onClick={() => void actions.moveToBacklog(task)}
                className="h-11 rounded-xl px-3 text-xs font-semibold"
              >
                Back to backlog
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-phase">Phase</Label>
              <select
                id="task-phase"
                value={task.phase_id ?? ""}
                onChange={(e) => void actions.setPhase(task, e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
              >
                <option value="">Backlog</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-kr">Key result</Label>
              <select
                id="task-kr"
                value={task.key_result_id ?? ""}
                onChange={(e) => void actions.setKeyResult(task, e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
              >
                <option value="">None</option>
                {keyResults
                  .filter((kr) => kr.status !== "archived")
                  .map((kr) => (
                    <option key={kr.id} value={kr.id}>
                      {kr.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-impact">Impact</Label>
              <select
                id="task-impact"
                value={task.impact_level ?? ""}
                onChange={(e) =>
                  void actions.setImpact(
                    task,
                    (e.target.value || null) as "low" | "medium" | "high" | null,
                  )
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
              >
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-effort">Effort (minutes)</Label>
              <Input
                id="task-effort"
                type="number"
                min={0}
                inputMode="numeric"
                value={effortDraft}
                onChange={(e) => setEffortDraft(e.target.value)}
                onBlur={() =>
                  void actions.setEffort(task, effortDraft === "" ? null : Number(effortDraft))
                }
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {(task.expected_output || task.completion_criteria) && (
            <dl className="space-y-2 rounded-xl border border-border/60 p-3">
              {task.expected_output && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Expected output
                  </dt>
                  <dd className="text-sm text-foreground/85">{task.expected_output}</dd>
                </div>
              )}
              {task.completion_criteria && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Done when
                  </dt>
                  <dd className="text-sm text-foreground/85">{task.completion_criteria}</dd>
                </div>
              )}
            </dl>
          )}

          <p className="text-xs font-medium text-muted-foreground">
            {task.evidence_required ? "Evidence required · " : ""}
            Source: {task.scheduling_source ?? task.source ?? "manual"}
            {task.reschedule_count ? ` · rescheduled ${task.reschedule_count}×` : ""}
          </p>

          <Button
            variant="outline"
            onClick={() => {
              void actions.remove(task)
              onClose()
            }}
            className="h-11 w-full gap-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Delete task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
