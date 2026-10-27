"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ColorPicker, IconPicker } from "@/components/finance/settings/lookup-primitives";
import { ApiError } from "@/lib/api/client";
import { SPENDING_CLASS_META, SPENDING_CLASS_ORDER, suggestDefaultSpendingClass } from "@/lib/finance/spending-class";
import { cn } from "@/lib/utils";
import type { CategoryType, Category, SpendingClass } from "@/types/finance";

export const CATEGORY_ICONS = ["🍜", "🛒", "🚕", "🏠", "💡", "📱", "👕", "💊", "🎬", "📚", "✈️", "💼", "🎁", "💰"] as const;
export const CATEGORY_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6b7280"] as const;

// One label per type, shared with CategoriesSection's list rows so the same
// category never reads as "Both" in one place and something else in another.
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  expense: "Expense",
  income: "Income",
  both: "Income & expense",
};
const TYPE_OPTIONS = Object.values(CATEGORY_TYPE_LABELS);

function labelToType(label: string): CategoryType {
  const entry = (Object.keys(CATEGORY_TYPE_LABELS) as CategoryType[]).find(
    (type) => CATEGORY_TYPE_LABELS[type] === label
  );
  return entry ?? "expense";
}

export interface CategoryFormValues {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  spendingClass: SpendingClass | null;
}

export function CategorySheet({
  mode,
  category,
  open,
  onOpenChange,
  onSave,
}: {
  mode: "create" | "edit";
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: CategoryFormValues) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New category" : "Edit category"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Categories group your transactions and are what budgets are set against."
              : "Renaming a category updates it everywhere it is already used."}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <CategorySheetFields
            key={`${mode}-${category?.id ?? "create"}`}
            mode={mode}
            category={category}
            onSave={onSave}
            onOpenChange={onOpenChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CategorySheetFields({
  mode,
  category,
  onSave,
  onOpenChange,
}: {
  mode: "create" | "edit";
  category?: Category;
  onSave: (values: CategoryFormValues) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [type, setType] = useState<CategoryType>(category?.type ?? "expense");
  // A category with no class yet is pre-filled with the deterministic default
  // suggestion (if the name matches one) rather than left blank — the user
  // still sees and can change the selection before saving, so this is never
  // an invisible or irreversible assumption.
  const [spendingClass, setSpendingClass] = useState<SpendingClass | null>(
    category?.spendingClass ?? suggestDefaultSpendingClass(category?.name ?? "")
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), icon, color, type, spendingClass });
      onOpenChange(false);
    } catch (saveError) {
      // A duplicate name comes back as a 409 whose message names the existing
      // category — far more useful than a generic failure line.
      setError(saveError instanceof ApiError ? saveError.message : "Couldn't save the category. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Groceries, Transport…"
            maxLength={40}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label id="category-type-label">Applies to</Label>
          <ChipSelect
            options={TYPE_OPTIONS}
            value={CATEGORY_TYPE_LABELS[type]}
            onChange={(label) => setType(labelToType(label))}
          />
        </div>

        <IconPicker id="category-icon-label" label="Icon" icons={CATEGORY_ICONS} value={icon} onChange={setIcon} />
        <ColorPicker id="category-color-label" label="Color" colors={CATEGORY_COLORS} value={color} onChange={setColor} />

        <div className="space-y-1.5">
          <Label id="category-spending-class-label">Financial Health group (optional)</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="category-spending-class-label">
            {SPENDING_CLASS_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSpendingClass(spendingClass === option ? null : option)}
                aria-pressed={spendingClass === option}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95",
                  spendingClass === option
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {SPENDING_CLASS_META[option].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {spendingClass
              ? SPENDING_CLASS_META[spendingClass].description
              : "Groups this category into Essentials, Lifestyle, or Future on your Finance overview."}
          </p>
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
          {mode === "create" ? "Add category" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}
