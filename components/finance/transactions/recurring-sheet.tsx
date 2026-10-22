"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Pause, Pencil, Play, Plus, Repeat, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountField, CategoryIcon, FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/finance-primitives";
import { createRecurringRule, deleteRecurringRule, updateRecurringRule } from "@/lib/api/finance";
import { FREQUENCY_LABELS } from "@/lib/finance/recurring-schedule";
import { krw, usd } from "@/lib/finance-format";
import { recurringRulesQuery, useInvalidateAfter } from "@/lib/query/finance-queries";
import { cn } from "@/lib/utils";
import type { RecurringRuleInput } from "@/lib/validation/finance";
import type { Category, Currency, PaymentMethod, RecurringFrequency, RecurringRule, TransactionType } from "@/types/finance";

const FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];

const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ruleAmount(rule: RecurringRule): string {
  return rule.currency === "USD" && rule.originalAmount !== null ? usd.format(rule.originalAmount) : krw.format(rule.amountKrw);
}

/** The full input for a rule, so pause/resume can resave it unchanged otherwise. */
function toInput(rule: RecurringRule, overrides: Partial<RecurringRuleInput> = {}): RecurringRuleInput {
  return {
    type: rule.type,
    description: rule.description,
    currency: rule.currency,
    amountKrw: rule.currency === "KRW" ? rule.amountKrw : undefined,
    originalAmount: rule.currency === "USD" ? (rule.originalAmount ?? undefined) : undefined,
    categoryId: rule.categoryId,
    paymentMethodId: rule.paymentMethodId,
    note: rule.note,
    frequency: rule.frequency,
    nextDate: rule.nextDate,
    isActive: rule.isActive,
    ...overrides,
  };
}

function savedNotice(appliedCount: number): string {
  if (appliedCount === 0) return "Recurring rule saved.";
  return `Saved — added ${appliedCount} ${appliedCount === 1 ? "transaction" : "transactions"} that were already due.`;
}

export function RecurringSheet({
  open,
  onOpenChange,
  categories,
  paymentMethods,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const [editing, setEditing] = useState<{ rule?: RecurringRule } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEditing(null);
      setNotice(null);
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader className="pr-16">
          <SheetTitle>{editing ? (editing.rule ? "Edit recurring" : "New recurring") : "Recurring"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Added to Transactions automatically on each date."
              : "Salary, rent, subscriptions — added to Transactions on schedule."}
          </SheetDescription>
        </SheetHeader>
        {open &&
          (editing ? (
            <RecurringRuleForm
              key={editing.rule?.id ?? "new"}
              rule={editing.rule}
              categories={categories}
              paymentMethods={paymentMethods}
              onCancel={() => setEditing(null)}
              onSaved={(appliedCount) => {
                setNotice(savedNotice(appliedCount));
                setEditing(null);
              }}
            />
          ) : (
            <RecurringRuleList
              notice={notice}
              onAdd={() => {
                setNotice(null);
                setEditing({});
              }}
              onEdit={(rule) => {
                setNotice(null);
                setEditing({ rule });
              }}
            />
          ))}
      </SheetContent>
    </Sheet>
  );
}

function RecurringRuleList({
  notice,
  onAdd,
  onEdit,
}: {
  notice: string | null;
  onAdd: () => void;
  onEdit: (rule: RecurringRule) => void;
}) {
  const rules = useQuery(recurringRulesQuery);
  const invalidateAfter = useInvalidateAfter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null);

  async function toggleActive(rule: RecurringRule) {
    setBusyId(rule.id);
    setActionError(null);
    try {
      await updateRecurringRule(rule.id, toInput(rule, { isActive: !rule.isActive }));
      await invalidateAfter("recurring");
    } catch {
      setActionError(`Couldn't ${rule.isActive ? "pause" : "resume"} "${rule.description}". Try again.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await deleteRecurringRule(deleteTarget.id);
      setDeleteTarget(null);
      await invalidateAfter("recurring");
    } catch {
      setDeleteTarget(null);
      setActionError("Couldn't delete the rule. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
      {notice && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}
      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {rules.isError && !rules.data ? (
        <FinanceErrorState
          title="Recurring unavailable"
          description="We couldn't load your recurring rules. Try again in a moment."
          onRetry={() => void rules.refetch()}
        />
      ) : rules.isPending ? (
        <div className="h-32 rounded-2xl bg-secondary motion-safe:animate-pulse" aria-busy="true" aria-label="Loading recurring rules" />
      ) : rules.data.length === 0 ? (
        <FinanceEmptyState
          icon={Repeat}
          title="No recurring transactions yet"
          description="Add your salary, rent, or a subscription once, and it's recorded for you on every date."
          action={
            <Button size="sm" className="min-h-11" onClick={onAdd}>
              <Plus className="size-4" aria-hidden="true" />
              Add recurring
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
            {rules.data.map((rule) => (
              <li key={rule.id} className={cn("flex items-center gap-3 px-3 py-2.5", !rule.isActive && "opacity-60")}>
                <CategoryIcon icon={rule.categoryIcon} color={rule.categoryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{rule.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={rule.type === "income" ? "text-success" : undefined}>
                      {rule.type === "income" ? "+" : "−"}
                      {ruleAmount(rule)}
                    </span>
                    {" · "}
                    {FREQUENCY_LABELS[rule.frequency]}
                    {" · "}
                    {rule.isActive ? `Next ${shortDate(rule.nextDate)}` : "Paused"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    onClick={() => void toggleActive(rule)}
                    disabled={busyId === rule.id}
                    aria-label={`${rule.isActive ? "Pause" : "Resume"} ${rule.description}`}
                  >
                    {busyId === rule.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : rule.isActive ? (
                      <Pause className="size-4" aria-hidden="true" />
                    ) : (
                      <Play className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-11" onClick={() => onEdit(rule)} aria-label={`Edit ${rule.description}`}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(rule)}
                    aria-label={`Delete ${rule.description}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="min-h-11" onClick={onAdd}>
            <Plus className="size-4" aria-hidden="true" />
            Add recurring
          </Button>
        </>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && busyId === null && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring rule</AlertDialogTitle>
            <AlertDialogDescription>
              Stop adding <strong>{deleteTarget?.description}</strong>? Transactions it already added stay in your
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busyId !== null}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={busyId !== null}>
              {busyId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecurringRuleForm({
  rule,
  categories,
  paymentMethods,
  onCancel,
  onSaved,
}: {
  rule?: RecurringRule;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onCancel: () => void;
  onSaved: (appliedCount: number) => void;
}) {
  const invalidateAfter = useInvalidateAfter();
  const [type, setType] = useState<TransactionType>(rule?.type ?? "expense");
  const [currency, setCurrency] = useState<Currency>(rule?.currency ?? "KRW");
  const [amount, setAmount] = useState(
    rule ? String(rule.currency === "USD" ? (rule.originalAmount ?? "") : rule.amountKrw) : ""
  );
  const [description, setDescription] = useState(rule?.description ?? "");
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(rule?.paymentMethodId ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(rule?.frequency ?? "monthly");
  const [nextDate, setNextDate] = useState(rule?.nextDate ?? localToday());
  const [note, setNote] = useState(rule?.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = categories.filter((category) => category.type === type || category.type === "both");
  const dueNow = nextDate !== "" && nextDate <= localToday() && (rule?.isActive ?? true);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (description.trim().length === 0) {
      setError("Description is required.");
      return;
    }

    const input: RecurringRuleInput = {
      type,
      description: description.trim(),
      currency,
      amountKrw: currency === "KRW" ? parsedAmount : undefined,
      originalAmount: currency === "USD" ? parsedAmount : undefined,
      categoryId: availableCategories.some((category) => category.id === categoryId) ? categoryId : null,
      paymentMethodId: paymentMethodId || null,
      note: note.trim() || null,
      frequency,
      nextDate,
      isActive: rule?.isActive ?? true,
    };

    setPending(true);
    setError(null);
    try {
      const result = rule ? await updateRecurringRule(rule.id, input) : await createRecurringRule(input);
      await invalidateAfter("recurring");
      onSaved(result.appliedCount);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save the rule. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl border bg-secondary p-1">
          {(["expense", "income"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={cn(
                "min-h-11 rounded-lg text-sm font-semibold capitalize transition-colors active:scale-[0.98]",
                type === option
                  ? option === "expense"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "bg-success text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="recurring-amount">Amount</Label>
            <div className="flex gap-1 rounded-lg border bg-secondary p-0.5">
              {(["KRW", "USD"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCurrency(option)}
                  aria-pressed={currency === option}
                  className={cn(
                    "min-h-11 rounded-md px-2.5 text-xs font-semibold transition-colors sm:min-h-7",
                    currency === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <AmountField
            symbol={currency === "USD" ? "$" : "₩"}
            id="recurring-amount"
            inputMode={currency === "USD" ? "decimal" : "numeric"}
            min="0"
            step={currency === "USD" ? "0.01" : "1"}
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          {currency === "USD" && (
            <p className="text-xs text-muted-foreground">Converted to KRW at each date&apos;s exchange rate.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recurring-description">Description</Label>
          <Input
            id="recurring-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={type === "income" ? "Salary" : "Rent"}
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Repeats</Label>
          <div className="grid grid-cols-4 gap-1 rounded-xl border bg-secondary p-1" role="group" aria-label="Frequency">
            {FREQUENCIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFrequency(option)}
                aria-pressed={frequency === option}
                className={cn(
                  "min-h-11 rounded-lg text-xs font-semibold transition-colors sm:text-sm",
                  frequency === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {FREQUENCY_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recurring-next-date">{rule ? "Next date" : "First date"}</Label>
          <Input
            id="recurring-next-date"
            type="date"
            value={nextDate}
            onChange={(event) => setNextDate(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            {dueNow
              ? "This date is today or earlier, so it's added as soon as you save."
              : frequency === "monthly" || frequency === "yearly"
                ? "Later dates keep this day of the month — the last day in shorter months."
                : "Added to Transactions on this date and every repeat after it."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="recurring-category">Category</Label>
            <select
              id="recurring-category"
              value={availableCategories.some((category) => category.id === categoryId) ? categoryId : ""}
              onChange={(event) => setCategoryId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">No category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recurring-payment-method">Payment method</Label>
            <select
              id="recurring-payment-method"
              value={paymentMethodId}
              onChange={(event) => setPaymentMethodId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">None</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recurring-note">Note</Label>
          <Input
            id="recurring-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
            maxLength={500}
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="min-h-11 flex-1">
          Back
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {rule ? "Save changes" : "Add recurring"}
        </Button>
      </SheetFooter>
    </form>
  );
}
