"use client"

import { useParams, useRouter } from "next/navigation"

import { OverviewTab } from "@/components/goals/detail/OverviewTab"
import { useGoalDetail } from "@/hooks/useGoalDetail"
import type { Task } from "@/lib/tasks"

/**
 * Overview — the goal's action surface. The shell (header, section nav, and
 * every dialog) lives in layout.tsx; this route renders only its own section.
 */
export default function GoalOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const detail = useGoalDetail(id)

  // The layout renders the loading and not-found states for all five routes.
  if (!detail.goal) return null

  // Sending a task to Schedule is a navigation now, so it lands in history and
  // the resulting URL is shareable.
  const scheduleTask = (task: Task) => router.push(`/goals/${id}/schedule?task=${task.id}`)

  return (
    <div className="space-y-4">
      <OverviewTab
        goal={detail.goal}
        tasks={detail.tasks}
        keyResults={detail.keyResults}
        phases={detail.phases}
        todayYmd={detail.todayYmd}
        onToggleTask={detail.toggleTaskCompletion}
        onScheduleTask={scheduleTask}
        onOpenSchedule={() => router.push(`/goals/${id}/schedule`)}
        onOpenPlan={() => router.push(`/goals/${id}/plan`)}
      />
    </div>
  )
}
