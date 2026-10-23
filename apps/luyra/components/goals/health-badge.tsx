import { GOAL_HEALTH_LABELS, getHealthStatusStyling, type GoalHealthStatus } from "@/lib/goal-health";
import { cn } from "@/lib/utils";

// Health status is always a dot + text label, never color alone.
export function HealthBadge({ status, className }: { status: GoalHealthStatus; className?: string }) {
  const styling = getHealthStatusStyling(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
        styling.badgeColor,
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", styling.dotColor)} aria-hidden="true" />
      {GOAL_HEALTH_LABELS[status]}
    </span>
  );
}
