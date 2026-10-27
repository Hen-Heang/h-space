import type { Goal } from "@/types/goal";
import type { GoalDeadlineInfo } from "@/lib/goal-deadline";

// Ported from Hengo's health-status concept (lib/goals.ts / lib/goal-health.ts),
// simplified to what Luyra's Goal actually tracks: no key results or tasks
// to derive health from, just `progress` + the deadline info above.

export type GoalHealthStatus = "on_track" | "attention" | "at_risk" | "completed" | "paused";

export const GOAL_HEALTH_LABELS: Record<GoalHealthStatus, string> = {
  on_track: "On track",
  attention: "Needs attention",
  at_risk: "At risk",
  completed: "Completed",
  paused: "Paused",
};

export function computeGoalHealth(goal: Pick<Goal, "status" | "progress">, deadline: GoalDeadlineInfo): GoalHealthStatus {
  if (goal.status === "completed") return "completed";
  if (goal.status === "paused") return "paused";
  if (deadline.status === "overdue" || (deadline.status === "due_today" && goal.progress < 100)) return "at_risk";
  if (deadline.status === "approaching_deadline" && goal.progress < 60) return "attention";
  return "on_track";
}

export function getHealthStatusStyling(status: GoalHealthStatus): { dotColor: string; badgeColor: string } {
  switch (status) {
    case "completed":
      return {
        dotColor: "bg-emerald-500",
        badgeColor:
          "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "at_risk":
      return {
        dotColor: "bg-red-500",
        badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
      };
    case "attention":
      return {
        dotColor: "bg-amber-500",
        badgeColor:
          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
      };
    case "paused":
      return { dotColor: "bg-zinc-400", badgeColor: "bg-secondary text-secondary-foreground border-transparent" };
    default:
      return {
        dotColor: "bg-sky-500",
        badgeColor: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800",
      };
  }
}
