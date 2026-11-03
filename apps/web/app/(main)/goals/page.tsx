"use client"

import { useCallback, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/goals/DeleteConfirmDialog"
import { EditGoalSlidePanel } from "@/components/goals/EditGoalSlidePanel"
import { GoalList } from "@/components/goals/GoalList"
import { GoalSorter } from "@/components/goals/GoalSorter"
import { GoalsHubHeader } from "@/components/goals/hub/GoalsHubHeader"
import { useGoals } from "@/hooks/useGoals"
import { type Goal } from "@/lib/goals"
import { cn } from "@/lib/utils"

type GoalFilter = "all" | "active" | "completed"

export default function GoalsPage() {
  const {
    sortedGoals,
    isLoading,
    isDeleting,
    goalToDelete,
    showDeleteDialog,
    sortOption,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setShowDeleteDialog,
    deleteGoal,
    confirmDelete,
    updateSort,
    toggleStar,
    toggleComplete,
    fetchGoals,
  } = useGoals()

  const [goalFilter, setGoalFilter] = useState<GoalFilter>("active")
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showEditPanel, setShowEditPanel] = useState(false)

  const activeGoals = useMemo(
    () => sortedGoals.filter((g) => g.status !== "completed" && g.status !== "archived"),
    [sortedGoals],
  )
  const completedGoals = useMemo(
    () => sortedGoals.filter((g) => g.status === "completed"),
    [sortedGoals],
  )
  const allGoals = useMemo(() => sortedGoals.filter((g) => g.status !== "archived"), [sortedGoals])

  const filteredGoals =
    goalFilter === "all" ? allGoals : goalFilter === "active" ? activeGoals : completedGoals
  const filteredTotalPages = Math.max(1, Math.ceil(filteredGoals.length / itemsPerPage))
  const displayGoals = useMemo(
    () => filteredGoals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredGoals, currentPage, itemsPerPage],
  )

  const emptyState =
    allGoals.length === 0
      ? {
          title: "No goals yet",
          description: "Create your first goal and turn it into a clear plan.",
        }
      : goalFilter === "active"
        ? { title: "No active goals", description: "Completed goals can be found under Completed." }
        : goalFilter === "completed"
          ? {
              title: "Nothing completed yet.",
              description: "Finish a goal and it'll show up here.",
            }
          : undefined

  const handleEditGoal = useCallback((goal: Goal, event: React.MouseEvent) => {
    event.stopPropagation()
    setEditingGoal(goal)
    setShowEditPanel(true)
  }, [])

  const handleGoalUpdated = useCallback(() => {
    fetchGoals()
    setShowEditPanel(false)
    setEditingGoal(null)
    toast.success("Goal updated")
  }, [fetchGoals])

  return (
    <div className="space-y-6 pb-12">
      <GoalsHubHeader description="Plan goals, track deadlines, and manage what you're working toward." />

      <div className="min-w-0 space-y-6">
        {/* Filter. Full width on phones, each option sized by its label
            (flex-auto) so "Completed" fits at 320px — the old w-fit row
            overflowed there; its natural width from sm. */}
        <div
          role="group"
          aria-label="Filter goals"
          className="flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-fit"
        >
          {(["all", "active", "completed"] as const).map((tab) => {
            const count =
              tab === "all"
                ? allGoals.length
                : tab === "active"
                  ? activeGoals.length
                  : completedGoals.length
            const isSelected = goalFilter === tab
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setGoalFilter(tab)
                  setCurrentPage(1)
                }}
                className={cn(
                  "flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-none sm:px-4",
                  isSelected
                    ? "bg-background font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:bg-background/50 hover:text-foreground",
                )}
              >
                <span className="truncate">{tab}</span>
                <span
                  className={cn(
                    "rounded px-1.5 text-xs font-medium tabular-nums",
                    isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <GoalList
          toolbar={<GoalSorter sortOption={sortOption} onSortChange={updateSort} />}
          goals={displayGoals}
          isLoading={isLoading}
          isDeleting={isDeleting}
          sortOption={sortOption}
          onDeleteGoal={confirmDelete}
          onEditGoal={handleEditGoal}
          onToggleStar={toggleStar}
          onToggleComplete={toggleComplete}
          emptyState={emptyState}
        />

        {filteredTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg"
            >
              <ChevronLeft size={18} />
            </Button>
            <span className="min-w-[5rem] text-center text-sm font-medium text-muted-foreground tabular-nums">
              {currentPage} / {filteredTotalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= filteredTotalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>

      <EditGoalSlidePanel
        isOpen={showEditPanel}
        goal={editingGoal}
        onClose={() => {
          setShowEditPanel(false)
          setEditingGoal(null)
        }}
        onSuccess={handleGoalUpdated}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          if (goalToDelete) void deleteGoal(goalToDelete.id)
        }}
        goalTitle={goalToDelete?.title || ""}
      />
    </div>
  )
}
