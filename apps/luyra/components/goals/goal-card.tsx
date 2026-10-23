"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MoreHorizontal, Pause, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteGoal, updateGoal } from "@/lib/api/goals";
import { calculateGoalDeadlineInfo } from "@/lib/goal-deadline";
import { computeGoalHealth } from "@/lib/goal-health";
import type { Goal, GoalStatus } from "@/types/goal";

import { DeadlineStatusBadge } from "./deadline-status-badge";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { GoalFormSheet } from "./goal-form-sheet";
import { HealthBadge } from "./health-badge";

const CATEGORY_LABEL: Record<string, string> = {
  personal: "Personal",
  career: "Career",
  finance: "Finance",
  learning: "Learning",
  health: "Health",
  other: "Other",
};

const progressGradient = (progress: number) =>
  progress >= 75
    ? "linear-gradient(90deg, #10b981, #059669)"
    : progress >= 40
      ? "linear-gradient(90deg, #3b82f6, #2563eb)"
      : "linear-gradient(90deg, #f59e0b, #ef4444)";

export function GoalCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  const deadline = calculateGoalDeadlineInfo(goal);
  const health = computeGoalHealth(goal, deadline);

  async function setStatus(status: GoalStatus) {
    setPending(true);
    try {
      await updateGoal(goal.id, { status });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteGoal(goal.id);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{goal.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {goal.category && <span className="shrink-0">{CATEGORY_LABEL[goal.category]}</span>}
              <HealthBadge status={health} />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Goal actions" className="shrink-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {goal.status === "active" && (
                <>
                  <DropdownMenuItem onClick={() => setStatus("paused")} disabled={pending}>
                    <Pause className="size-4" /> Pause
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus("completed")} disabled={pending}>
                    <CheckCircle2 className="size-4" /> Mark complete
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === "paused" && (
                <>
                  <DropdownMenuItem onClick={() => setStatus("active")} disabled={pending}>
                    <Play className="size-4" /> Resume
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus("completed")} disabled={pending}>
                    <CheckCircle2 className="size-4" /> Mark complete
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === "completed" && (
                <DropdownMenuItem onClick={() => setStatus("active")} disabled={pending}>
                  <RotateCcw className="size-4" /> Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/8">
            <div
              className="h-full rounded-full"
              style={{ width: `${goal.progress}%`, background: progressGradient(goal.progress) }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tabular-nums text-foreground">{goal.progress}%</span>
            <DeadlineStatusBadge deadlineInfo={deadline} />
          </div>
        </div>
      </div>

      <GoalFormSheet mode="edit" goal={goal} open={editing} onOpenChange={setEditing} />
      <DeleteConfirmDialog
        isOpen={confirmingDelete}
        isDeleting={deleting}
        goalTitle={goal.title}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
