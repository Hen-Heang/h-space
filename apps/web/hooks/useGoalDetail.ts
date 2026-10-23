"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"

import { goalsApi, tasksApi, getApiErrorMessage } from "@/lib/api"
import { goalsQueryKey } from "@/hooks/useGoals"
import { useGoalPlan } from "@/hooks/useGoalPlan"
import { getUserId } from "@/lib/auth-store"
import { calculateGoalDeadlineInfo, type Goal } from "@/lib/goals"
import { allKeyResultsAchieved, computeGoalProgress } from "@/lib/goal-progress"
import { computeGoalHealth } from "@/lib/goal-health"
import { parseYMD } from "@/lib/calendar"
import { taskCompletionPatch, todayInAppTimezone } from "@/lib/task-status"
import type { CreateTaskPayload } from "@/lib/api"

/**
 * Everything the goal-detail shell and its five routes need: queries, derived
 * progress/health, and the shared mutations.
 *
 * The layout and each page both call this. React Query dedupes on the shared
 * keys, so it's one fetch per resource however many callers there are — which
 * is what lets the routes be real routes instead of tab panels sharing one
 * component's state.
 */
export function useGoalDetail(id: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const userId = getUserId()

  const [isDeleting, setIsDeleting] = useState(false)
  const [isMutatingStatus, setIsMutatingStatus] = useState(false)

  // Today as a civil date **in Asia/Seoul** — every planning calculation takes
  // this as an argument so the pure engines stay clock-independent, testable,
  // and agree with the user's day rather than the host's.
  const todayYmd = useMemo(() => todayInAppTimezone(), [])

  const goalKey = useMemo(() => ["goal", id] as const, [id])
  const tasksKey = useMemo(() => ["goal", id, "tasks"] as const, [id])
  const membersKey = useMemo(() => ["goal", id, "members"] as const, [id])

  const {
    data: goal,
    isPending: goalLoading,
    error: goalError,
  } = useQuery({ queryKey: goalKey, queryFn: () => goalsApi.get(id), enabled: !!id })

  const { data: tasks = [] } = useQuery({
    queryKey: tasksKey,
    queryFn: () => goalsApi.getTasks(id),
    enabled: !!id,
  })

  const { data: members = [] } = useQuery({
    queryKey: membersKey,
    queryFn: () => goalsApi.getMembers(id),
    enabled: !!id,
  })

  const { phases, phasesLoading, rules, rulesLoading, refetchPhases, refetchRules } =
    useGoalPlan(id)

  useEffect(() => {
    if (goalError) toast.error("Could not load this goal", { description: "Please try again." })
  }, [goalError])

  const isOwner = goal != null && userId != null && String(userId) === String(goal.user_id)
  const deadlineInfo = useMemo(() => (goal ? calculateGoalDeadlineInfo(goal) : null), [goal])

  const completedTasks = tasks.filter((t) => t.completed).length
  const totalTasks = tasks.length

  // Outcome vs activity progress (Goal System v2) — see lib/goal-progress.ts.
  const progress = computeGoalProgress(
    { total: totalTasks, completed: completedTasks },
    goal?.keyResults ?? [],
  )

  const health = useMemo(() => {
    if (!goal) return null
    const now = new Date()
    const overdueHighImpactTaskCount = tasks.filter(
      (t) => !t.completed && t.impact_level === "high" && new Date(t.end_date) < now,
    ).length
    const lastCompletedAt = tasks
      .filter((t) => t.completed && t.updated_at)
      .map((t) => new Date(t.updated_at as string).getTime())
      .reduce((max, v) => (v > max ? v : max), 0)
    const daysSinceLastActivity =
      lastCompletedAt > 0 ? Math.floor((now.getTime() - lastCompletedAt) / 86_400_000) : null

    return computeGoalHealth({
      goalStatus: goal.status,
      hasKeyResults: progress.hasActiveKeyResults,
      outcomeProgress: progress.outcomeProgress,
      allKeyResultsAchieved: allKeyResultsAchieved(goal.keyResults ?? []),
      activityTotalTasks: totalTasks,
      activityCompletedTasks: tasks.filter((t) => t.completed).length,
      targetDate: goal.target_date,
      startDate: goal.metadata?.start_date ?? null,
      noDuration: Boolean(goal.no_duration || goal.metadata?.no_duration),
      now,
      daysSinceLastActivity,
      overdueHighImpactTaskCount,
    })
  }, [goal, tasks, progress.hasActiveKeyResults, progress.outcomeProgress, totalTasks])

  // ── Refetch helpers ───────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: goalKey })
    void queryClient.invalidateQueries({ queryKey: tasksKey })
    void queryClient.invalidateQueries({ queryKey: goalsQueryKey(userId) })
  }, [queryClient, userId, goalKey, tasksKey])

  const refreshTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: tasksKey })
  }, [queryClient, tasksKey])

  const refreshGoal = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: goalKey })
  }, [queryClient, goalKey])

  const patchGoalCache = useCallback(
    (updated: Goal) =>
      queryClient.setQueryData<Goal>(goalKey, (prev) => (prev ? { ...prev, ...updated } : updated)),
    [queryClient, goalKey],
  )

  // ── Mutations ─────────────────────────────────────────────────────────────

  /** Writes `status` alongside `completed` — the two must never drift apart. */
  const toggleTaskCompletion = useCallback(
    async (taskId: string, completed: boolean) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      try {
        await tasksApi.update(taskId, taskCompletionPatch(!completed, task, todayYmd))
        refresh()
      } catch {
        toast.error("Could not update task", { description: "Please try again." })
      }
    },
    [tasks, todayYmd, refresh],
  )

  const createTask = useCallback(
    async (payload: Omit<CreateTaskPayload, "goal_id"> & { completed?: boolean }) => {
      const { completed = false, ...rest } = payload
      await tasksApi.create({
        goal_id: id,
        ...rest,
        // Never write `completed` without `status` — see lib/task-status.ts.
        ...taskCompletionPatch(
          completed,
          { start_date: rest.start_date, end_date: rest.end_date },
          todayYmd,
        ),
      })
      refreshTasks()
    },
    [id, todayYmd, refreshTasks],
  )

  const updateStatus = useCallback(
    async (status: string, successMsg: string) => {
      if (!goal) return
      setIsMutatingStatus(true)
      try {
        patchGoalCache(await goalsApi.update(goal.id, { status }))
        refresh()
        toast.success(successMsg)
      } catch (e) {
        toast.error("Could not update goal", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      } finally {
        setIsMutatingStatus(false)
      }
    },
    [goal, patchGoalCache, refresh],
  )

  const extendDeadline = useCallback(
    async (date: Date | null) => {
      if (!goal || !date) return
      try {
        patchGoalCache(await goalsApi.update(goal.id, { target_date: format(date, "yyyy-MM-dd") }))
        refresh()
        toast.success("Deadline updated", { description: format(date, "MMM d, yyyy") })
      } catch (e) {
        toast.error("Could not update deadline", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [goal, patchGoalCache, refresh],
  )

  const toggleStar = useCallback(async () => {
    if (!goal) return
    const flip = () =>
      queryClient.setQueryData<Goal>(goalKey, (prev) =>
        prev ? { ...prev, isStarred: !prev.isStarred } : prev,
      )
    flip()
    try {
      await goalsApi.toggleStar(goal.id)
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(userId) })
    } catch {
      flip()
      toast.error("Could not update pin")
    }
  }, [goal, queryClient, goalKey, userId])

  const deleteGoal = useCallback(async () => {
    if (!goal) return
    setIsDeleting(true)
    try {
      await goalsApi.remove(goal.id)
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(userId) })
      toast.success("Goal deleted")
      router.push("/goals")
    } catch (e) {
      toast.error("Could not delete goal", {
        description: getApiErrorMessage(e, "Please try again."),
      })
      setIsDeleting(false)
    }
  }, [goal, queryClient, userId, router])

  const leaveGoal = useCallback(async () => {
    try {
      await goalsApi.leaveGoal(id)
      void queryClient.invalidateQueries({ queryKey: goalsQueryKey(userId) })
      toast.success("You left the goal")
      router.push("/goals")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not leave the goal"))
    }
  }, [id, queryClient, userId, router])

  const removeMember = useCallback(
    async (memberUserId: string, name: string) => {
      try {
        await goalsApi.removeMember(id, memberUserId)
        void queryClient.invalidateQueries({ queryKey: membersKey })
        void queryClient.invalidateQueries({ queryKey: goalKey })
        toast.success(`Removed ${name}`)
      } catch (e) {
        toast.error(getApiErrorMessage(e, "Could not remove member"))
      }
    },
    [id, queryClient, goalKey, membersKey],
  )

  // Goal date window, parsed safely — passed into every date-bounded surface
  // (the calendar, the add-task dialog, phase and routine dates).
  const goalStartYmd = goal?.metadata?.start_date?.slice(0, 10) ?? null
  const goalTargetYmd = goal?.target_date ?? null

  return {
    id,
    goal,
    goalLoading,
    tasks,
    members,
    memberCount: members.length || goal?.memberCounts?.total || 0,
    keyResults: goal?.keyResults ?? [],
    phases,
    phasesLoading,
    rules,
    rulesLoading,
    userId,
    isOwner,
    isDeleting,
    isMutatingStatus,
    todayYmd,
    deadlineInfo,
    progress,
    displayProgress: progress.outcomeProgress ?? progress.activityProgress.percentage,
    health,
    goalStartYmd,
    goalTargetYmd,
    goalStartDate: parseYMD(goalStartYmd) ?? undefined,
    goalTargetDate: parseYMD(goalTargetYmd) ?? undefined,
    refresh,
    refreshTasks,
    refreshGoal,
    refetchPhases,
    refetchRules,
    patchGoalCache,
    toggleTaskCompletion,
    createTask,
    updateStatus,
    extendDeadline,
    toggleStar,
    deleteGoal,
    leaveGoal,
    removeMember,
  }
}

export type GoalDetail = ReturnType<typeof useGoalDetail>
