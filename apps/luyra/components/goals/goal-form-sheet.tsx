"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createGoal, updateGoal } from "@/lib/api/goals";
import type { Goal, GoalCategory } from "@/types/goal";

const CATEGORIES: { label: string; value: GoalCategory }[] = [
  { label: "Personal", value: "personal" },
  { label: "Career", value: "career" },
  { label: "Finance", value: "finance" },
  { label: "Learning", value: "learning" },
  { label: "Health", value: "health" },
  { label: "Other", value: "other" },
];

const FIELD_CLASS =
  "flex h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:text-sm";

/**
 * Unified create/edit panel for a goal — replaces the old inline GoalForm and
 * the always-toggled-inline edit state on the card. Same fields the previous
 * form had (title, description, category, target date), plus progress for
 * edit mode, since Luyra goals track progress manually rather than
 * deriving it from tasks/key results like Hengo's does.
 */
export function GoalFormSheet({
  mode,
  goal,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  goal?: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New goal" : "Edit goal"}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? "Add a goal to track." : "Update your goal details."}
          </SheetDescription>
        </SheetHeader>

        {/* Keyed by the open transition so each opening starts from the goal's
            current values instead of resetting stale state via an effect. */}
        {open && (
          <GoalFormFields key={`${mode}-${goal?.id ?? "create"}`} mode={mode} goal={goal} onOpenChange={onOpenChange} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function GoalFormFields({
  mode,
  goal,
  onOpenChange,
}: {
  mode: "create" | "edit";
  goal?: Goal;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [category, setCategory] = useState<GoalCategory | "">(goal?.category ?? "");
  const [noDueDate, setNoDueDate] = useState(!goal?.targetDate);
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [progress, setProgress] = useState(String(goal?.progress ?? 0));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (mode === "create") {
        await createGoal({
          title,
          description: description.trim() || undefined,
          category: category || undefined,
          targetDate: noDueDate ? undefined : targetDate || undefined,
        });
      } else if (goal) {
        const progressValue = Math.min(100, Math.max(0, Math.round(Number(progress)) || 0));
        await updateGoal(goal.id, {
          title,
          description: description.trim() === "" ? null : description.trim(),
          category: category || null,
          targetDate: noDueDate ? null : targetDate || null,
          progress: progressValue,
        });
      }
      router.refresh();
      onOpenChange(false);
    } catch {
      setError("Couldn't save the goal. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-title">Title</Label>
          <Input id="goal-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-description">Description</Label>
          <Textarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-category">Category</Label>
          <select
            id="goal-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as GoalCategory | "")}
            className={FIELD_CLASS}
          >
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "edit" && (
          <div className="space-y-1.5">
            <Label htmlFor="goal-progress">Progress (%)</Label>
            <Input
              id="goal-progress"
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex min-h-11 items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
            <Label htmlFor="goal-no-due-date" className="font-normal">
              No due date
            </Label>
            <input
              id="goal-no-due-date"
              type="checkbox"
              checked={noDueDate}
              onChange={(e) => setNoDueDate(e.target.checked)}
              className="size-6 rounded border-input"
            />
          </div>
          {!noDueDate && (
            <div className="space-y-1.5">
              <Label htmlFor="goal-target-date">Target date</Label>
              <Input
                id="goal-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={pending || title.trim().length === 0} className="flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}
