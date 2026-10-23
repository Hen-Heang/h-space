"use client"

import { GoalsHubHeader } from "@/components/goals/hub/GoalsHubHeader"
import { TodaysTasks } from "@/components/goals/TodaysTasks"

// The single canonical home for the full, interactive Today's Tasks
// experience (composer, goal filter, mark-all/undo) — it used to be
// duplicated between /dashboard and the /goals aside; now it lives here only.
export default function GoalsTasksPage() {
  return (
    <div className="space-y-6 pb-12">
      <GoalsHubHeader description="Every task tied to your goals, plus anything else on your plate today." />
      <TodaysTasks />
    </div>
  )
}
