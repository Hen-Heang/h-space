import { AlertTriangle, Calendar, CheckCircle2, Clock, Target, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDeadlineStatusIcon, getDeadlineStatusStyling, type GoalDeadlineInfo } from "@/lib/goal-deadline";
import { cn } from "@/lib/utils";

const ICONS = { CheckCircle2, AlertTriangle, Clock, Timer, Target, Calendar };

export function DeadlineStatusBadge({
  deadlineInfo,
  className,
}: {
  deadlineInfo: GoalDeadlineInfo;
  className?: string;
}) {
  const styling = getDeadlineStatusStyling(deadlineInfo.status);
  const Icon = ICONS[getDeadlineStatusIcon(deadlineInfo.status)];

  return (
    <Badge className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", styling.badgeColor, className)}>
      <Icon className={cn("size-3.5", styling.iconColor)} />
      <span className="font-medium">{deadlineInfo.statusMessage}</span>
    </Badge>
  );
}
