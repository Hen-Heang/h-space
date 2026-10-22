"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Loader2, Scale } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CategoryIcon, FinanceEmptyState } from "@/components/finance/ui/finance-primitives";
import { ApiError } from "@/lib/api/client";
import { applyBudgetPlan } from "@/lib/api/finance";
import { monthKeyLabel } from "@/lib/finance-cron-time";
import { krw } from "@/lib/finance-format";
import type { BudgetRecommendation, NextMonthBudgetPlan } from "@/types/finance";

function isChange(recommendation: BudgetRecommendation): boolean {
  return recommendation.recommendedBudgetKrw !== recommendation.currentBudgetKrw;
}

function signedKrw(value: number): string {
  return `${value > 0 ? "+" : ""}${krw.format(value)}`;
}

// Nothing is written until the user selects budgets and confirms. The server
// re-derives the plan on apply and rejects it if the numbers moved meanwhile.
export function ReviewNextMonthPlan({
  month,
  plan,
  appliedCount,
  onApplied,
}: {
  month: string;
  plan: NextMonthBudgetPlan;
  appliedCount: number | null;
  onApplied: (count: number) => void;
}) {
  // Pre-select every recommendation that actually changes a budget, so the
  // user reviews a concrete plan rather than an empty list.
  const [selected, setSelected] = useState(
    () => new Set(plan.recommendations.filter(isChange).map((r) => r.categoryId))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecommendations = useMemo(
    () => plan.recommendations.filter((r) => selected.has(r.categoryId)),
    [plan, selected]
  );
  const selectedTotalKrw = selectedRecommendations.reduce((sum, r) => sum + r.recommendedBudgetKrw, 0);

  function toggle(categoryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const result = await applyBudgetPlan({
        month,
        changes: selectedRecommendations.map((r) => ({ categoryId: r.categoryId, amountKrw: r.recommendedBudgetKrw })),
      });
      setConfirmOpen(false);
      onApplied(result.applied);
    } catch (err) {
      setConfirmOpen(false);
      setError(
        err instanceof ApiError && err.code === "CONFLICT"
          ? err.message
          : "We couldn't apply the plan. Your budgets were not changed — try again in a moment."
      );
    } finally {
      setApplying(false);
    }
  }

  if (plan.recommendations.length === 0) {
    return (
      <FinanceEmptyState
        icon={Scale}
        title="Not enough history yet"
        description="Categorized spending over the last few months is needed to suggest next month's budgets."
      />
    );
  }

  const changeCount = plan.recommendations.filter(isChange).length;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted-foreground">
        Based on {plan.monthsAnalyzed.map(monthKeyLabel).join(", ")}. Only categories you marked Flexible or Avoidable
        are trimmed, and only by a small step.
      </p>

      {plan.projectedSavingsRatePct !== null && (
        <div className="rounded-xl border bg-secondary/40 p-3 text-sm">
          <p>
            Following every suggestion leaves a projected savings rate of{" "}
            <span className="font-semibold tabular-nums">{plan.projectedSavingsRatePct}%</span> against your{" "}
            <span className="tabular-nums">{plan.targetSavingsRatePct}%</span> target.
          </p>
          {plan.additionalTrimNeededKrw > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reaching the target would take about {krw.format(plan.additionalTrimNeededKrw)} more in cuts — that&apos;s
              information only; nothing is trimmed for you.
            </p>
          )}
        </div>
      )}

      {appliedCount !== null && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Updated {appliedCount} {appliedCount === 1 ? "budget" : "budgets"} for {monthKeyLabel(plan.planMonth)}.
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y divide-border">
          {plan.recommendations.map((rec) => {
            const changed = isChange(rec);
            const delta = rec.recommendedBudgetKrw - rec.currentBudgetKrw;
            const inputId = `plan-${rec.categoryId}`;
            return (
              <li key={rec.categoryId}>
                <label htmlFor={inputId} className={`flex gap-3 p-4 ${changed ? "cursor-pointer" : ""}`}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={selected.has(rec.categoryId)}
                    disabled={!changed || applying}
                    onChange={() => toggle(rec.categoryId)}
                    className="mt-1 size-5 shrink-0 rounded border-input disabled:opacity-40"
                    aria-label={`Apply new budget for ${rec.categoryName}`}
                  />
                  <CategoryIcon icon={rec.categoryIcon} color={rec.categoryColor} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-col items-start gap-1 xs:flex-row xs:items-baseline xs:justify-between xs:gap-3">
                      <span className="truncate text-sm font-semibold">{rec.categoryName}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {rec.currentBudgetKrw > 0 && changed && (
                          <span className="mr-2 text-muted-foreground line-through">{krw.format(rec.currentBudgetKrw)}</span>
                        )}
                        <span className="font-semibold">{krw.format(rec.recommendedBudgetKrw)}</span>
                        {changed && (
                          <span className={`ml-1.5 text-xs ${delta < 0 ? "text-success" : "text-warning"}`}>
                            {signedKrw(delta)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {changed ? rec.rationale : "Already matches your budget — nothing to change."}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <Button
        className="min-h-11 w-full"
        onClick={() => setConfirmOpen(true)}
        disabled={selectedRecommendations.length === 0 || applying || changeCount === 0}
      >
        <Check className="size-4" aria-hidden="true" />
        Apply plan for {monthKeyLabel(plan.planMonth)}
        {selectedRecommendations.length > 0 && ` (${selectedRecommendations.length})`}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !applying && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply next month&apos;s plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This updates {selectedRecommendations.length}{" "}
              {selectedRecommendations.length === 1 ? "budget" : "budgets"}, totalling {krw.format(selectedTotalKrw)} a
              month. Transactions and savings goals are not affected, and you can change any budget again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={() => handleApply()} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Applying...
                </>
              ) : (
                "Apply plan"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
