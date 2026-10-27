"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountField, CategoryIcon } from "@/components/finance/ui/finance-primitives";
import { listSavingsContributions } from "@/lib/api/finance";
import { usd } from "@/lib/finance-format";
import type { SavingsGoal, SavingsContribution } from "@/types/finance";

function formatContributionDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ContributionSheet({
  goal,
  open,
  onOpenChange,
  onSave,
}: {
  goal: SavingsGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (amountUsd: number) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle>Add contribution</SheetTitle>
          <SheetDescription>{goal ? `Record a deposit toward ${goal.name}.` : "Record a deposit toward this goal."}</SheetDescription>
        </SheetHeader>
        {open && goal && (
          <ContributionSheetFields key={goal.id} goal={goal} onSave={onSave} onOpenChange={onOpenChange} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContributionSheetFields({
  goal,
  onSave,
  onOpenChange,
}: {
  goal: SavingsGoal;
  onSave: (amountUsd: number) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ state: "loading" | "ready" | "error"; contributions: SavingsContribution[] }>({
    state: "loading",
    contributions: [],
  });

  useEffect(() => {
    let active = true;
    listSavingsContributions(goal.id)
      .then((contributions) => {
        if (active) setHistory({ state: "ready", contributions });
      })
      .catch(() => {
        if (active) setHistory({ state: "error", contributions: [] });
      });
    return () => {
      active = false;
    };
  }, [goal.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave(parsedAmount);
      onOpenChange(false);
    } catch {
      setError("Couldn't save the contribution. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl border bg-secondary/50 px-3 py-2.5">
          <CategoryIcon icon={goal.icon} color={goal.color} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{goal.name}</p>
            <p className="text-xs text-muted-foreground">
              {usd.format(goal.currentUsd)} of {usd.format(goal.targetUsd)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contribution-amount">Amount</Label>
          <AmountField
            symbol="$"
            id="contribution-amount"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Recent contributions</Label>
          {history.state === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading history…</p>
          ) : history.state === "error" ? (
            <p className="text-xs text-muted-foreground">Couldn&apos;t load contribution history.</p>
          ) : history.contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No contributions recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="max-h-40 divide-y divide-border overflow-y-auto">
                {history.contributions.slice(0, 10).map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{formatContributionDate(contribution.createdAt)}</span>
                    <span className="font-mono font-medium tabular-nums">+{usd.format(contribution.amountUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="min-h-11 flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add contribution
        </Button>
      </SheetFooter>
    </form>
  );
}
