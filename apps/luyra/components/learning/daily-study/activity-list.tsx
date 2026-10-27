"use client";

import { useState } from "react";
import { CheckCircle2, Circle, PlayCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DailyStudyActivity } from "@/types/learning";

const TYPE_LABELS: Record<DailyStudyActivity["type"], string> = {
  review: "Review",
  shadowing: "Shadowing",
  vocabulary: "Vocabulary",
  roleplay: "Role-play",
  correction_retry: "Reflection",
};

export function ActivityList({
  activities,
  onAction,
}: {
  activities: DailyStudyActivity[];
  onAction: (activityId: string, action: "start" | "complete" | "skip") => Promise<void>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(activityId: string, action: "start" | "complete" | "skip") {
    setPendingId(activityId);
    try {
      await onAction(activityId, action);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {activities.map((activity) => {
        const isPending = pendingId === activity.id;
        return (
          <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="shrink-0">
              {activity.status === "completed" ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : activity.status === "active" ? (
                <PlayCircle className="size-5 text-sky-500" />
              ) : activity.status === "skipped" ? (
                <SkipForward className="size-5 text-muted-foreground/50" />
              ) : (
                <Circle className="size-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", activity.status === "skipped" && "text-muted-foreground line-through")}>
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABELS[activity.type]} · {activity.estimatedMinutes} min
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {activity.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(activity.id, "start")}>
                    Start
                  </Button>
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run(activity.id, "skip")}>
                    Skip
                  </Button>
                </>
              )}
              {activity.status === "active" && (
                <Button size="sm" disabled={isPending} onClick={() => run(activity.id, "complete")}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
