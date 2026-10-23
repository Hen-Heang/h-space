"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"

import { GoalsHubHeader } from "@/components/goals/hub/GoalsHubHeader"
import { GoalTasksSnapshot } from "@/components/goals/GoalTasksSnapshot"
import { GoalsOverview } from "@/components/dashboard/GoalsOverview"
import { RoadmapTeaser } from "@/components/dashboard/RoadmapTeaser"
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines"
import { useGoals } from "@/hooks/useGoals"
import { calculateGoalDeadlineInfo, getDeadlineNotificationMessage } from "@/lib/goals"

// The old /dashboard folded in here: a snapshot view inside the Goals
// workspace rather than a competing top-level destination. Deliberately
// leaves out the full Today's Tasks composer/filter widget (that's the
// Tasks tab's job alone, see GoalTasksSnapshot) and any new charts — just
// goal-specific tasks, upcoming deadlines, and progress.
export default function GoalsOverviewPage() {
  const { sortedGoals } = useGoals()

  const activeGoals = useMemo(
    () => sortedGoals.filter((g) => g.status !== "completed" && g.status !== "archived"),
    [sortedGoals],
  )
  const completedGoals = useMemo(
    () => sortedGoals.filter((g) => g.status === "completed"),
    [sortedGoals],
  )
  const overdueGoals = useMemo(
    () => activeGoals.filter((g) => calculateGoalDeadlineInfo(g).status === "overdue"),
    [activeGoals],
  )
  const deadlineMessage = useMemo(() => getDeadlineNotificationMessage(sortedGoals), [sortedGoals])

  return (
    <div className="space-y-5 pb-12 sm:space-y-6">
      <GoalsHubHeader
        description="A snapshot of your active goals, deadlines, and progress."
        stats={[
          { label: "Active", value: String(activeGoals.length) },
          { label: "Overdue", value: String(overdueGoals.length) },
          { label: "Completed", value: String(completedGoals.length) },
        ]}
      />

      {deadlineMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
          <AlertTriangle size={20} strokeWidth={2} className="shrink-0 text-amber-500" />
          {deadlineMessage}
        </div>
      )}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <GoalTasksSnapshot />
        <UpcomingDeadlines />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.4fr_1fr]">
        <GoalsOverview />
        <RoadmapTeaser />
      </div>
    </div>
  )
}
