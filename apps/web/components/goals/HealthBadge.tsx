import { GOAL_HEALTH_LABELS, getHealthStatusStyling, type GoalHealthStatus } from "@/lib/goals"
import { cn } from "@/lib/utils"

// Health status is always shown as a dot + text label together — never
// color alone (accessibility requirement: don't rely only on color). The dot
// carries the color; the label stays neutral and readable (13px+), with no
// pill chrome, so a row with a health status doesn't read as a row of badges.
export function HealthBadge({
  status,
  reason,
  size = "sm",
}: {
  status: GoalHealthStatus
  reason?: string | null
  size?: "sm" | "md"
}) {
  const styling = getHealthStatusStyling(status)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-medium text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm",
      )}
      title={reason ?? undefined}
    >
      <span className={cn("size-2 shrink-0 rounded-full", styling.dotColor)} aria-hidden="true" />
      {GOAL_HEALTH_LABELS[status]}
    </span>
  )
}
