"use client"

import { useMemo } from "react"

import { GoalsHubHeader } from "@/components/goals/hub/GoalsHubHeader"
import { GoalTasksSnapshot } from "@/components/goals/GoalTasksSnapshot"
import { GoalsOverview } from "@/components/dashboard/GoalsOverview"
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines"
import { useGoals } from "@/hooks/useGoals"
import { calculateGoalDeadlineInfo } from "@/lib/goals"

// The old /dashboard folded in here: a snapshot view inside the Goals
// workspace rather than a competing top-level destination. Deliberately
// leaves out the full Today's Tasks composer/filter widget (that's the
// Tasks tab's job alone, see GoalTasksSnapshot) and any new charts — just
// goal-specific tasks, upcoming deadlines, and progress.
//
// Every card uses the shared DashboardCard frame (components/home). There is
// no separate deadline banner: the Overdue count sits in the header stats and
// overdue goals lead the Upcoming deadlines list. The dev-roadmap card that
// used to close this page now lives in the Learning hub's Library
// (components/learn/RoadmapLibraryItem) — it's a study plan, not a goal.
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

      {/* Explicit minmax(0, …) tracks: the implicit auto track grows to the
          widest single-line task title and pushed the card off phone screens. */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GoalTasksSnapshot />
        <UpcomingDeadlines />
      </div>

      <GoalsOverview />
    </div>
  )
}
