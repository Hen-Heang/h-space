"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { goalsApi, getApiErrorMessage } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { Goal, SortOption } from "@/lib/goals"

// Pure client-side sort — sorting must never trigger a network refetch.
const sortGoals = (list: Goal[], opt: SortOption): Goal[] => {
  return [...list].sort((a, b) => {
    // Starred goals always float to the top, regardless of the chosen sort
    // field/direction. The selected sort then orders goals *within* each group.
    const starCmp = Number(!!b.isStarred) - Number(!!a.isStarred)
    if (starCmp !== 0) return starCmp

    let cmp = 0
    switch (opt.field) {
      case "title":
        cmp = (a.title || "").localeCompare(b.title || "")
        break
      case "target_date":
        cmp = new Date(a.target_date || 0).getTime() - new Date(b.target_date || 0).getTime()
        break
      case "status":
        cmp = String(a.status || "").localeCompare(String(b.status || ""))
        break
      case "created_at":
      default:
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }
    return opt.direction === "asc" ? cmp : -cmp
  })
}

// Query key factory so cache invalidation/updates stay consistent.
export const goalsQueryKey = (userId?: string | null) => ["goals", userId] as const

const ITEMS_PER_PAGE = 4

/**
 * Goals for the authenticated user (backend scopes by JWT and returns goals
 * pre-enriched with taskCounts + isStarred — Orbit's client-side joins across
 * goals/goal_members/tasks/goal_stars are now the backend's job).
 *
 * Sorting and pagination stay client-side and derived, so neither triggers a
 * network refetch. Return surface mirrors Orbit's useGoals for a clean port.
 */
export const useGoals = () => {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const key = goalsQueryKey(userId)

  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>({
    field: "created_at",
    direction: "desc",
  })
  const [currentPage, setCurrentPage] = useState(1)

  const {
    data: allGoals = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: key,
    queryFn: () => goalsApi.list(),
    enabled: userId != null,
  })

  // Surface fetch failures (TanStack Query v5 has no onError on useQuery).
  useEffect(() => {
    if (error) {
      console.error("Error fetching goals:", error)
      toast.error("Could not load your goals", { description: "Please try again." })
    }
  }, [error])

  // Derived, client-side: sort then paginate.
  const sortedGoals = useMemo(() => sortGoals(allGoals, sortOption), [allGoals, sortOption])
  const totalPages = Math.max(1, Math.ceil(sortedGoals.length / ITEMS_PER_PAGE))
  const goals = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedGoals.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedGoals, currentPage])

  // Clamp the current page if the goal count shrinks (e.g. after a delete).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const fetchGoals = useCallback(async () => {
    await refetch()
  }, [refetch])

  const handleGoalCreated = useCallback(
    (newGoal: Goal) => {
      queryClient.setQueryData<Goal[]>(key, (prev) => [newGoal, ...(prev || [])])
      setCurrentPage(1)
      toast.success("Success!", { description: "Your goal has been created." })
    },
    [queryClient, key],
  )

  const deleteGoal = useCallback(
    async (goalId: string) => {
      setIsDeleting(goalId)
      try {
        await goalsApi.remove(goalId) // backend cascades tasks
        queryClient.setQueryData<Goal[]>(key, (prev) => (prev || []).filter((g) => g.id !== goalId))
        toast.success("Goal deleted", { description: "Your goal has been removed." })
      } catch (err) {
        console.error("Error deleting goal:", err)
        toast.error(getApiErrorMessage(err, "Failed to delete the goal. Please try again."))
      } finally {
        setIsDeleting(null)
        setShowDeleteDialog(false)
        setGoalToDelete(null)
      }
    },
    [queryClient, key],
  )

  const confirmDelete = useCallback((goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation()
    setGoalToDelete(goal)
    setShowDeleteDialog(true)
  }, [])

  const updateSort = useCallback((newSortOption: SortOption) => {
    setSortOption(newSortOption)
  }, [])

  // Optimistic star toggle: flip cached flag (re-sorts via derived sortedGoals),
  // persist, roll back on failure. No refetch — sort is client-side.
  const toggleStar = useCallback(
    async (goalId: string) => {
      if (userId == null) return
      const current = queryClient.getQueryData<Goal[]>(key)
      const nextStarred = !current?.find((g) => g.id === goalId)?.isStarred

      const apply = (starred: boolean) =>
        queryClient.setQueryData<Goal[]>(key, (list) =>
          (list || []).map((g) => (g.id === goalId ? { ...g, isStarred: starred } : g)),
        )

      apply(nextStarred)
      try {
        await goalsApi.toggleStar(goalId)
      } catch (err) {
        apply(!nextStarred) // roll back
        console.error("Error toggling goal star:", err)
        toast.error("Couldn't update star", { description: "Please try again." })
      }
    },
    [userId, queryClient, key],
  )

  // Optimistic complete/reopen toggle: flip cached status, persist, roll back
  // on failure. Mirrors toggleStar — no refetch, filters are client-side.
  const toggleComplete = useCallback(
    async (goalId: string) => {
      const current = queryClient.getQueryData<Goal[]>(key)
      const goal = current?.find((g) => g.id === goalId)
      if (!goal) return
      const prevStatus = goal.status
      const nextStatus = prevStatus === "completed" ? "active" : "completed"

      const apply = (status: string) =>
        queryClient.setQueryData<Goal[]>(key, (list) =>
          (list || []).map((g) => (g.id === goalId ? { ...g, status } : g)),
        )

      apply(nextStatus)
      try {
        await goalsApi.update(goalId, { status: nextStatus })
        // Keep the goal-detail cache in sync if it was visited before.
        void queryClient.invalidateQueries({ queryKey: ["goal", goalId] })
        toast.success(nextStatus === "completed" ? "Goal completed! 🎉" : "Goal reopened")
      } catch (err) {
        apply(prevStatus) // roll back
        console.error("Error updating goal status:", err)
        toast.error("Couldn't update goal", {
          description: getApiErrorMessage(err, "Please try again."),
        })
      }
    },
    [queryClient, key],
  )

  return {
    goals,
    allGoals,
    sortedGoals,
    isLoading: isPending,
    /** The goals query failed (a toast also fires once); lets a card show an inline error. */
    isError: error != null,
    isDeleting,
    goalToDelete,
    showDeleteDialog,
    sortOption,
    currentPage,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    setCurrentPage,
    setShowDeleteDialog,
    handleGoalCreated,
    deleteGoal,
    confirmDelete,
    updateSort,
    toggleStar,
    toggleComplete,
    fetchGoals,
  }
}
