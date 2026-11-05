"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { goalsApi, tasksApi, getApiErrorMessage, type CreateTaskPayload } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { goalsQueryKey } from "@/hooks/useGoals"
import type { Task } from "@/lib/tasks"

// Ported from Orbit src/hooks/useTodaysTasks.ts. Supabase queries are replaced
// with KoriAI's REST api (tasksApi.range / goalsApi). Sharing + self-notification
// side effects are dropped (deferred seams — see docs/INTEGRATION.md).

const selectionKey = (userId: number | string) => `dg_todays_tasks_selected_goals_v1:${userId}`

const startOfToday = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfTodayIso = (): string => {
  const d = startOfToday()
  return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
}

// Pure sort: incomplete first, anytime before timed, then by daily start time.
const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1
    if (a.is_anytime && !b.is_anytime) return -1
    if (!a.is_anytime && b.is_anytime) return 1
    if (a.is_anytime && b.is_anytime) return 0
    const ta = a.daily_start_time ?? ""
    const tb = b.daily_start_time ?? ""
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

// Keep today's tasks plus any still-incomplete task carried over from earlier days.
const isDueTodayOrCarriedOver = (t: Task, today: Date): boolean => {
  const endOk = !!t.end_date && new Date(t.end_date) >= today
  return endOk || !t.completed
}

export const todaysTasksQueryKey = (userId?: string | null) => ["tasks", "today", userId] as const

export function useTodaysTasks() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const tasksKey = todaysTasksQueryKey(userId)

  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  // Ids changed by the last "mark all" — undo reverts exactly these.
  const [undoneIds, setUndoneIds] = useState<string[]>([])
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionInitialized = useRef(false)

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    }
  }, [])

  // Goals (shares cache with useGoals) provide the goal filter + titles.
  const { data: goals = [] } = useQuery({
    queryKey: goalsQueryKey(userId),
    queryFn: () => goalsApi.list(),
    enabled: userId != null,
  })

  // All of the user's tasks up to end-of-today; filtering to what's visible is
  // derived client-side, so changing the goal selection never refetches.
  const {
    data: rawTasks = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: tasksKey,
    queryFn: () => tasksApi.range({ to: endOfTodayIso() }),
    enabled: userId != null,
  })

  const availableGoals = useMemo(() => goals.map((g) => ({ id: g.id, title: g.title })), [goals])

  const persistSelection = useCallback(
    (ids: string[]) => {
      if (userId == null) return
      try {
        localStorage.setItem(selectionKey(userId), JSON.stringify(ids))
      } catch {
        /* storage unavailable */
      }
    },
    [userId],
  )

  // Once goals are known, restore the saved selection (default: all goals).
  useEffect(() => {
    if (selectionInitialized.current) return
    if (userId == null || goals.length === 0) return
    const allIds = goals.map((g) => g.id)
    let initial: string[] = allIds.slice()
    try {
      const saved = localStorage.getItem(selectionKey(userId))
      if (saved) initial = (JSON.parse(saved) as string[]).filter((id) => allIds.includes(id))
    } catch {
      /* ignore */
    }
    setSelectedGoalIds(initial)
    selectionInitialized.current = true
  }, [userId, goals])

  // Derived visible list: due/carried-over + selected goal (standalone always shown), sorted.
  const tasks = useMemo(() => {
    const today = startOfToday()
    const visible = rawTasks
      .filter((t) => isDueTodayOrCarriedOver(t, today))
      .filter((t) => !t.goal_id || selectedGoalIds.includes(t.goal_id))
    return sortTasks(visible)
  }, [rawTasks, selectedGoalIds])

  const patchTasks = useCallback(
    (updater: (list: Task[]) => Task[]) =>
      queryClient.setQueryData<Task[]>(tasksKey, (prev) => updater(prev ?? [])),
    [queryClient, tasksKey],
  )

  const toggleGoal = useCallback(
    (goalId: string) => {
      const next = selectedGoalIds.includes(goalId)
        ? selectedGoalIds.filter((id) => id !== goalId)
        : [...selectedGoalIds, goalId]
      setSelectedGoalIds(next)
      persistSelection(next)
    },
    [selectedGoalIds, persistSelection],
  )

  const toggleAll = useCallback(() => {
    const allIds = availableGoals.map((g) => g.id)
    const allSelected = allIds.length > 0 && selectedGoalIds.length === allIds.length
    const next = allSelected ? [] : allIds
    setSelectedGoalIds(next)
    persistSelection(next)
  }, [availableGoals, selectedGoalIds, persistSelection])

  // Single create path for the Today's Tasks composer — quick title-only adds
  // and the expanded (description/time/color) form both funnel through this,
  // so there's exactly one way a task gets created rather than two competing
  // ones. Handles cache patching and the goal-filter safety net below.
  const createTask = useCallback(
    async (payload: CreateTaskPayload) => {
      try {
        const created = await tasksApi.create(payload)
        patchTasks((prev) => [...prev, created])
        // Keep the task visible even if its goal is currently filtered out.
        if (payload.goal_id && !selectedGoalIds.includes(payload.goal_id)) {
          const next = [...selectedGoalIds, payload.goal_id]
          setSelectedGoalIds(next)
          persistSelection(next)
        }
        return created
      } catch (e) {
        toast.error("Could not add task", {
          description: getApiErrorMessage(e, "Please try again."),
        })
        throw e
      }
    },
    [patchTasks, selectedGoalIds, persistSelection],
  )

  const handleToggleTaskCompletion = useCallback(
    async (taskId: string, currentStatus: boolean) => {
      patchTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !currentStatus } : t)),
      )
      try {
        await tasksApi.update(taskId, { completed: !currentStatus })
      } catch (e) {
        patchTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed: currentStatus } : t)),
        )
        toast.error("Could not update task", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [patchTasks],
  )

  const handleMarkAllCompleted = useCallback(async () => {
    const incomplete = tasks.filter((t) => !t.completed)
    if (incomplete.length === 0) return
    setIsMarkingAll(true)
    const ids = incomplete.map((t) => t.id)
    try {
      await Promise.all(ids.map((id) => tasksApi.update(id, { completed: true })))
      patchTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, completed: true } : t)))
      setUndoneIds(ids)
      const n = ids.length
      toast.success("Tasks marked complete", {
        description: `${n} task${n === 1 ? "" : "s"} marked as completed.`,
      })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndoneIds([]), 5000)
    } catch (e) {
      toast.error("Could not mark tasks complete", {
        description: getApiErrorMessage(e, "Please try again."),
      })
    } finally {
      setIsMarkingAll(false)
    }
  }, [tasks, patchTasks])

  const handleUndoMarkAllCompleted = useCallback(async () => {
    if (undoneIds.length === 0) return
    const ids = undoneIds
    setUndoneIds([])
    if (undoTimer.current) clearTimeout(undoTimer.current)
    patchTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, completed: false } : t)))
    try {
      await Promise.all(ids.map((id) => tasksApi.update(id, { completed: false })))
      toast.success("Undone", { description: "Tasks reverted to their previous state." })
    } catch (e) {
      toast.error("Could not undo", { description: getApiErrorMessage(e, "Please try again.") })
    }
  }, [undoneIds, patchTasks])

  const editTask = useCallback(
    async (taskId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const before = queryClient.getQueryData<Task[]>(tasksKey)?.find((t) => t.id === taskId)
      patchTasks((list) => list.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)))
      try {
        await tasksApi.update(taskId, { title: trimmed })
      } catch (e) {
        if (before) patchTasks((list) => list.map((t) => (t.id === taskId ? before : t)))
        toast.error("Could not update task", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [queryClient, tasksKey, patchTasks],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      const before = queryClient.getQueryData<Task[]>(tasksKey)
      patchTasks((list) => list.filter((t) => t.id !== taskId))
      try {
        await tasksApi.remove(taskId)
      } catch (e) {
        if (before) queryClient.setQueryData(tasksKey, before)
        toast.error("Could not delete task", {
          description: getApiErrorMessage(e, "Please try again."),
        })
      }
    },
    [queryClient, tasksKey, patchTasks],
  )

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])
  const totalCount = tasks.length
  const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const goalTitleById = useMemo(() => {
    const map: Record<string, string> = {}
    availableGoals.forEach((g) => {
      map[g.id] = g.title
    })
    return map
  }, [availableGoals])

  const groups = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`

    const isCarriedOver = (t: Task) =>
      !t.completed && !!t.end_date && new Date(t.end_date) < todayStart

    const isOverdue = (t: Task) =>
      isCarriedOver(t) ||
      (!t.completed && !t.is_anytime && !!t.daily_end_time && t.daily_end_time < nowStr)

    const overdue: Task[] = []
    const scheduled: Task[] = []
    const anytime: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
      if (t.completed) completed.push(t)
      else if (isCarriedOver(t)) overdue.push(t)
      else if (t.is_anytime) anytime.push(t)
      else scheduled.push(t)
    }
    return { overdue, scheduled, anytime, completed, isOverdue }
  }, [tasks])

  return {
    tasks,
    loading: isPending,
    error: isError ? "Failed to load tasks." : "",
    availableGoals,
    selectedGoalIds,
    newTaskTitle,
    setNewTaskTitle,
    newTaskGoalId,
    setNewTaskGoalId,
    isMarkingAll,
    canUndo: undoneIds.length > 0,
    completedCount,
    totalCount,
    progressPct,
    groups,
    goalTitleById,
    toggleGoal,
    toggleAll,
    createTask,
    handleToggleTaskCompletion,
    handleMarkAllCompleted,
    handleUndoMarkAllCompleted,
    editTask,
    deleteTask,
  }
}
