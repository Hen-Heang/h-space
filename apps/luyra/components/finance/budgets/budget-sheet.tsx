"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountField, CategoryIcon } from "@/components/finance/ui/finance-primitives";
import { cn } from "@/lib/utils";
import type { BudgetPerformance, Category } from "@/types/finance";

type BudgetSheetTarget =
  | { mode: "create"; unbudgetedCategories: Category[] }
  | { mode: "edit"; budget: BudgetPerformance };

export function BudgetSheet({
  target,
  open,
  onOpenChange,
  onSave,
}: {
  target: BudgetSheetTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (categoryId: string, amountKrw: number) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle>{target?.mode === "edit" ? "Edit budget" : "New budget"}</SheetTitle>
          <SheetDescription>
            {target?.mode === "edit"
              ? "Update the monthly limit for this category."
              : "Set a monthly spending limit for a category."}
          </SheetDescription>
        </SheetHeader>
        {open && target && (
          <BudgetSheetFields
            key={target.mode === "edit" ? target.budget.categoryId : "create"}
            target={target}
            onSave={onSave}
            onOpenChange={onOpenChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BudgetSheetFields({
  target,
  onSave,
  onOpenChange,
}: {
  target: BudgetSheetTarget;
  onSave: (categoryId: string, amountKrw: number) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [categoryId, setCategoryId] = useState(target.mode === "edit" ? target.budget.categoryId : "");
  const [amount, setAmount] = useState(target.mode === "edit" ? String(target.budget.budgetKrw) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave(categoryId, parsedAmount);
      onOpenChange(false);
    } catch {
      setError("Couldn't save the budget. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {target.mode === "edit" ? (
          <div className="flex items-center gap-3 rounded-xl border bg-secondary/50 px-3 py-2.5">
            <CategoryIcon icon={target.budget.categoryIcon} color={target.budget.categoryColor} />
            <span className="text-sm font-semibold">{target.budget.categoryName}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Category</Label>
            {target.unbudgetedCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Every expense category already has a budget.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {target.unbudgetedCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors active:scale-[0.98]",
                      categoryId === category.id
                        ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary active:bg-secondary hover:text-foreground"
                    )}
                  >
                    <CategoryIcon icon={category.icon} color={categoryId === category.id ? null : category.color} className="size-6 text-sm" />
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="budget-amount">Monthly limit</Label>
          <AmountField
            symbol="₩"
            id="budget-amount"
            inputMode="numeric"
            min="0"
            step="1"
            autoFocus={target.mode === "edit"}
            placeholder="0"
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
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="min-h-11 flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {target.mode === "edit" ? "Save changes" : "Add budget"}
        </Button>
      </SheetFooter>
    </form>
  );
}
