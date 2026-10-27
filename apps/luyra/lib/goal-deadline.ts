import type { Goal } from "@/types/goal";

// Ported from Hengo's lib/goals.ts deadline-info logic, trimmed to Luyra's
// simpler Goal shape: no `no_duration`/`metadata.start_date`, so a missing
// `targetDate` is itself the "no deadline" case, and there's no time-elapsed
// progress bar to compute (Luyra goals already track a manual `progress`).

export type GoalDeadlineStatus =
  | "no_deadline"
  | "on_track"
  | "approaching_deadline"
  | "due_today"
  | "overdue"
  | "completed";

export type DeadlineUrgency = "low" | "medium" | "high" | "critical";

export interface GoalDeadlineInfo {
  status: GoalDeadlineStatus;
  daysRemaining: number | null;
  urgencyLevel: DeadlineUrgency;
  statusMessage: string;
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}

export function calculateGoalDeadlineInfo(goal: Pick<Goal, "status" | "targetDate">): GoalDeadlineInfo {
  if (goal.status === "completed") {
    return { status: "completed", daysRemaining: null, urgencyLevel: "low", statusMessage: "Completed" };
  }

  if (!goal.targetDate) {
    return { status: "no_deadline", daysRemaining: null, urgencyLevel: "low", statusMessage: "No deadline" };
  }

  const daysRemaining = daysBetween(new Date(), new Date(`${goal.targetDate}T00:00:00`));

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      status: "overdue",
      daysRemaining,
      urgencyLevel: "critical",
      statusMessage: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
    };
  }

  if (daysRemaining === 0) {
    return { status: "due_today", daysRemaining, urgencyLevel: "critical", statusMessage: "Due today" };
  }

  if (daysRemaining <= 7) {
    return {
      status: "approaching_deadline",
      daysRemaining,
      urgencyLevel: daysRemaining <= 3 ? "high" : "medium",
      statusMessage: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`,
    };
  }

  return {
    status: "on_track",
    daysRemaining,
    urgencyLevel: "low",
    statusMessage: `${daysRemaining} days remaining`,
  };
}

export function getDeadlineStatusStyling(status: GoalDeadlineStatus): { badgeColor: string; iconColor: string } {
  switch (status) {
    case "completed":
      return {
        badgeColor:
          "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };
    case "overdue":
      return {
        badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
        iconColor: "text-red-600 dark:text-red-400",
      };
    case "due_today":
      return {
        badgeColor:
          "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
        iconColor: "text-orange-600 dark:text-orange-400",
      };
    case "approaching_deadline":
      return {
        badgeColor:
          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
        iconColor: "text-amber-600 dark:text-amber-400",
      };
    case "no_deadline":
      return { badgeColor: "bg-secondary text-secondary-foreground border-transparent", iconColor: "text-muted-foreground" };
    default:
      return {
        badgeColor: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800",
        iconColor: "text-sky-600 dark:text-sky-400",
      };
  }
}

export function getDeadlineStatusIcon(
  status: GoalDeadlineStatus
): "CheckCircle2" | "AlertTriangle" | "Clock" | "Timer" | "Calendar" | "Target" {
  switch (status) {
    case "completed":
      return "CheckCircle2";
    case "overdue":
      return "AlertTriangle";
    case "due_today":
      return "Clock";
    case "approaching_deadline":
      return "Timer";
    case "no_deadline":
      return "Calendar";
    default:
      return "Target";
  }
}

/** Compact one-line label for a goal card footer, e.g. "Jan 1 · 5d left". */
export function formatDeadlineFooter(goal: Pick<Goal, "targetDate">, info: GoalDeadlineInfo): string {
  if (info.status === "no_deadline") return "No deadline";
  if (info.status === "completed") return "Completed";
  if (info.status === "overdue") return `Overdue by ${Math.abs(info.daysRemaining ?? 0)}d`;
  if (info.status === "due_today") return "Due today";
  if (!goal.targetDate) return info.statusMessage;

  const target = new Date(`${goal.targetDate}T00:00:00`);
  // Fixed locale, not `undefined` — server and client render environments
  // can have different default locales, which would mismatch on hydration.
  const label = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${label} · ${info.daysRemaining}d left`;
}
