"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@/lib/validation/finance";
import type { SavingsGoal, SavingsGoalPurpose } from "@/types/finance";

const ICONS = ["💰", "✈️", "🏠", "🚗", "🎓", "💻", "🎁", "🏖️"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// Purely descriptive — see AGENTS.md's Financial Health spec, section 15/16.
// A goal's purpose never changes how it's tracked (still USD target/current
// + manual contributions); it only labels what the goal is protecting or
// building toward.
export const SAVINGS_PURPOSE_LABELS: Record<SavingsGoalPurpose, string> = {
  emergency_fund: "Emergency fund",
  sinking_fund: "Sinking fund",
  goal: "Goal",
  investment: "Investment",
  other: "Other",
};
const PURPOSE_ORDER: SavingsGoalPurpose[] = ["emergency_fund", "sinking_fund", "goal", "investment", "other"];

export function SavingsGoalSheet({
  mode,
  goal,
  open,
  onOpenChange,
  onSave,
}: {
  mode: "create" | "edit";
  goal?: SavingsGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateSavingsGoalInput & UpdateSavingsGoalInput) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New savings goal" : "Edit savings goal"}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? "Set a target and start tracking progress." : "Update this goal's details."}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <SavingsGoalSheetFields
            key={`${mode}-${goal?.id ?? "create"}`}
            mode={mode}
            goal={goal}
            onSave={onSave}
            onOpenChange={onOpenChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SavingsGoalSheetFields({
  mode,
  goal,
  onSave,
  onOpenChange,
}: {
  mode: "create" | "edit";
  goal?: SavingsGoal;
  onSave: (input: CreateSavingsGoalInput & UpdateSavingsGoalInput) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? ICONS[0]);
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const [targetUsd, setTargetUsd] = useState(goal ? String(goal.targetUsd) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [note, setNote] = useState(goal?.note ?? "");
  const [purpose, setPurpose] = useState<SavingsGoalPurpose | null>(goal?.purpose ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const target = Number(targetUsd);
    if (!Number.isFinite(target) || target < 0) {
      setError("Enter a valid target amount.");
      return;
    }
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        targetUsd: target,
        currentUsd: goal?.currentUsd ?? 0,
        deadline: deadline || null,
        note: note.trim() || null,
        purpose,
      });
      onOpenChange(false);
    } catch {
      setError("Couldn't save the goal. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-name">Name</Label>
          <Input
            id="goal-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Cambodia trip, new laptop…"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                aria-pressed={icon === option}
                aria-label={`Icon ${option}`}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl border text-lg transition-colors active:scale-[0.95]",
                  icon === option ? "border-primary/40 bg-primary/10" : "border-border bg-background hover:bg-secondary active:bg-secondary"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-pressed={color === option}
                aria-label={`Color ${option}`}
                className="flex size-11 items-center justify-center rounded-xl transition-transform active:scale-[0.95]"
                style={{ backgroundColor: option, outline: color === option ? "2px solid var(--foreground)" : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label id="goal-purpose-label">Purpose (optional)</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="goal-purpose-label">
            {PURPOSE_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPurpose(purpose === option ? null : option)}
                aria-pressed={purpose === option}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95",
                  purpose === option
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {SAVINGS_PURPOSE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal-target">Target (USD)</Label>
            <Input
              id="goal-target"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={targetUsd}
              onChange={(event) => setTargetUsd(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-deadline">Target date (optional)</Label>
            <Input id="goal-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-note">Note (optional)</Label>
          <Textarea id="goal-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="min-h-11 flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {mode === "create" ? "Add goal" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}
