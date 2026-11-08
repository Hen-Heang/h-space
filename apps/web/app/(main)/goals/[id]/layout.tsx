"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Target } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteConfirmDialog } from "@/components/goals/DeleteConfirmDialog"
import { EditGoalSlidePanel } from "@/components/goals/EditGoalSlidePanel"
import { AddTaskDialog, type TaskRangePayload } from "@/components/calendar/AddTaskDialog"
import { GoalDetailHeader } from "@/components/goals/detail/GoalDetailHeader"
import { GoalDetailNav } from "@/components/goals/detail/GoalDetailNav"
import { GoalDetailShellProvider } from "@/components/goals/detail/GoalDetailShell"
import { CoachPanel } from "@/components/goals/detail/CoachPanel"
import { ManagementPanel } from "@/components/goals/detail/ManagementPanel"
import { AiTaskPlanDialog } from "@/components/goals/detail/AiTaskPlanDialog"
import { useMobileHeaderTitle } from "@/components/layout/mobile-header-title"
import { useGoalDetail } from "@/hooks/useGoalDetail"
import { getApiErrorMessage } from "@/lib/api"
import { resolveTaskStatus } from "@/lib/task-status"

/**
 * The goal-detail shell: header, section nav, and every dialog/panel.
 *
 * Each of the five sections is a real route, so the tab state lives in the URL
 * (deep-linkable, back-button-friendly) instead of localStorage. Data is
 * fetched through `useGoalDetail`, which the pages also call — React Query
 * dedupes on the shared keys, so this is one fetch, not two.
 */
export default function GoalDetailLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const detail = useGoalDetail(id)

  // Feeds the app shell's mobile header its "Back | <goal title> | ⋯" title.
  useMobileHeaderTitle(detail.goal?.title)

  const [showEditPanel, setShowEditPanel] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [showCoach, setShowCoach] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [addTaskPhaseId, setAddTaskPhaseId] = useState<string | null>(null)

  // ?aiPlan=1 — the goal form's "Draft an action plan with AI" switch lands
  // here and opens the draft-and-confirm dialog (nothing is written until the
  // user applies a draft). Derived from the URL rather than synced into state
  // by an effect, so there's no cascading render and closing it is a
  // navigation the back button understands.
  const aiPlanRequested = searchParams.get("aiPlan") === "1"
  const [aiPlanDismissed, setAiPlanDismissed] = useState(false)
  const [aiPlanOpened, setAiPlanOpened] = useState(false)
  const showAiPlan = aiPlanOpened || (aiPlanRequested && !aiPlanDismissed)

  const openAddTask = useCallback((phaseId: string | null) => {
    setAddTaskPhaseId(phaseId)
    setShowAddTask(true)
  }, [])

  const shell = useMemo(
    () => ({
      openAddTask,
      openCoach: () => setShowCoach(true),
      openAiPlan: () => setAiPlanOpened(true),
      openManagement: () => setShowManagement(true),
    }),
    [openAddTask],
  )

  const { goal, tasks, todayYmd, createTask } = detail

  const openTaskCount = useMemo(
    () => tasks.filter((t) => resolveTaskStatus(t, todayYmd) !== "completed").length,
    [tasks, todayYmd],
  )

  const navItems = useMemo(
    () => [
      { href: `/goals/${id}`, label: "Overview" },
      { href: `/goals/${id}/plan`, label: "Plan" },
      { href: `/goals/${id}/tasks`, label: "Tasks", count: openTaskCount },
      { href: `/goals/${id}/schedule`, label: "Schedule" },
      { href: `/goals/${id}/progress`, label: "Progress" },
    ],
    [id, openTaskCount],
  )

  const handleAddTask = useCallback(
    async (description: string, date: Date, _time?: string, range?: TaskRangePayload) => {
      const toIso = (d?: Date | null) => (d && !isNaN(d.getTime()) ? d.toISOString() : undefined)
      try {
        await createTask({
          title: range?.title?.trim() || "Untitled task",
          description,
          start_date: toIso(range?.start_date ?? date)!,
          end_date: toIso(range?.end_date ?? date)!,
          daily_start_time: range?.is_anytime ? null : (range?.daily_start_time ?? null),
          daily_end_time: range?.is_anytime ? null : (range?.daily_end_time ?? null),
          is_anytime: range?.is_anytime ?? false,
          duration_minutes: range?.duration_minutes ?? null,
          effort_minutes: range?.duration_minutes ?? null,
          color: range?.color ?? null,
          phase_id: addTaskPhaseId,
          scheduling_source: "manual",
          completed: range?.completed ?? false,
        })
        toast.success("Task created")
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to create task"))
        throw err
      }
    },
    [createTask, addTaskPhaseId],
  )

  if (detail.goalLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted/20 text-muted-foreground/40">
          <Target size={40} />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Goal not found</h2>
          <p className="mt-2 max-w-sm text-sm font-medium text-muted-foreground">
            This goal may have been deleted or moved.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl font-semibold">
          <Link href="/goals">
            <ArrowLeft size={18} className="mr-2" /> Back to Goals
          </Link>
        </Button>
      </div>
    )
  }

  const isCompleted = goal.status === "completed"
  const isArchived = goal.status === "archived"
  const toggleComplete = () =>
    detail.updateStatus(
      isCompleted ? "active" : "completed",
      isCompleted ? "Goal reopened" : "Goal completed! 🎉",
    )

  return (
    <GoalDetailShellProvider value={shell}>
      <div className="space-y-5 pb-12" data-goal-id={id}>
        <GoalDetailHeader
          goal={goal}
          deadlineInfo={detail.deadlineInfo}
          health={detail.health}
          progressLabel={
            detail.progress.hasActiveKeyResults ? "Outcome progress" : "Activity progress"
          }
          progressValue={detail.displayProgress}
          isMutatingStatus={detail.isMutatingStatus}
          isOwner={detail.isOwner}
          memberCount={detail.memberCount}
          onToggleComplete={toggleComplete}
          onToggleStar={detail.toggleStar}
          onPlanWeek={() => router.push(`/goals/${id}/schedule`)}
          onAddTask={() => openAddTask(null)}
          onAskAi={() => setShowCoach(true)}
          onEdit={() => setShowEditPanel(true)}
          onManage={() => setShowManagement(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />

        <GoalDetailNav items={navItems} />

        {children}
      </div>

      <AddTaskDialog
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAddTask={handleAddTask}
        defaultDate={
          detail.goalStartDate && detail.goalStartDate > new Date()
            ? detail.goalStartDate
            : new Date()
        }
        goalStartDate={detail.goalStartDate}
        goalTargetDate={detail.goalTargetDate}
      />

      <CoachPanel
        isOpen={showCoach}
        goalId={id}
        goalTitle={goal.title}
        onClose={() => setShowCoach(false)}
        onDraftPlan={() => {
          setShowCoach(false)
          setAiPlanOpened(true)
        }}
      />

      <AiTaskPlanDialog
        isOpen={showAiPlan}
        goalId={id}
        goalType={goal.metadata?.goal_type}
        onClose={() => {
          setAiPlanOpened(false)
          setAiPlanDismissed(true)
        }}
        onApplied={detail.refresh}
      />

      <ManagementPanel
        isOpen={showManagement}
        goal={goal}
        goalId={id}
        members={detail.members}
        userId={detail.userId != null ? String(detail.userId) : null}
        isOwner={detail.isOwner}
        isArchived={isArchived}
        onClose={() => setShowManagement(false)}
        onRefresh={detail.refresh}
        onEdit={() => {
          setShowManagement(false)
          setShowEditPanel(true)
        }}
        onLeave={detail.leaveGoal}
        onRemoveMember={detail.removeMember}
        onExtendDeadline={detail.extendDeadline}
        onToggleArchive={() =>
          detail.updateStatus(isArchived ? "active" : "archived", "Status updated")
        }
        onDelete={() => {
          setShowManagement(false)
          setShowDeleteDialog(true)
        }}
      />

      <EditGoalSlidePanel
        isOpen={showEditPanel}
        goal={goal}
        onClose={() => setShowEditPanel(false)}
        onSuccess={detail.refresh}
      />
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        isDeleting={detail.isDeleting ? goal.id : null}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={detail.deleteGoal}
        goalTitle={goal.title}
      />
    </GoalDetailShellProvider>
  )
}
