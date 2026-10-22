"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinanceEmptyState, FinanceErrorState, FinanceMetricGrid, FinanceSection, MonthSelector } from "@/components/finance/ui/finance-primitives";
import { BudgetCard } from "@/components/finance/budgets/budget-card";
import { BudgetSummary } from "@/components/finance/budgets/budget-summary";
import { BudgetSheet } from "@/components/finance/budgets/budget-sheet";
import { DeleteBudgetDialog } from "@/components/finance/budgets/delete-budget-dialog";
import { monthBounds, monthLabel } from "@/lib/finance-month";
import { deleteBudget, upsertBudget } from "@/lib/api/finance";
import { budgetsQuery, useInvalidateAfter } from "@/lib/query/finance-queries";
import type { BudgetPerformance, Category } from "@/types/finance";

function BudgetListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading budgets">
      <FinanceMetricGrid>
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-28 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </FinanceMetricGrid>
      <div className="space-y-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="h-28 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function BudgetList() {
  const [monthOffset, setMonthOffset] = useState(0);
  const invalidateAfter = useInvalidateAfter();
  const { start, end } = monthBounds(monthOffset);
  const budgets = useQuery(budgetsQuery(start, end));
  const loading = budgets.isPending;
  // A failed background refresh keeps the month already on screen.
  const loadError = budgets.isError && !budgets.data;
  const categories = useMemo(() => budgets.data?.categories ?? [], [budgets.data]);
  const performance = budgets.data?.performance ?? [];
  const [sheetTarget, setSheetTarget] = useState<
    { mode: "create"; unbudgetedCategories: Category[] } | { mode: "edit"; budget: BudgetPerformance } | null
  >(null);
  const [removeTarget, setRemoveTarget] = useState<BudgetPerformance | null>(null);
  const [removing, setRemoving] = useState(false);

  const unbudgetedCategories = useMemo(() => {
    const budgetedCategoryIds = new Set(budgets.data?.budgets.map((budget) => budget.categoryId));
    return categories.filter((category) => !budgetedCategoryIds.has(category.id));
  }, [categories, budgets.data]);

  // Budgets are standing limits, not per month, so every cached month and
  // the overview's budget alerts and daily guide go stale together.
  function refresh() {
    return invalidateAfter("budget");
  }

  async function handleSave(categoryId: string, amountKrw: number) {
    await upsertBudget({ categoryId, amountKrw });
    refresh();
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await deleteBudget(removeTarget.categoryId);
      setRemoveTarget(null);
      refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => setMonthOffset((offset) => offset - 1)}
          onNext={() => setMonthOffset((offset) => offset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Budgets month selector"
          size="sm"
        />
        <Button
          size="sm"
          className="min-h-11"
          onClick={() => setSheetTarget({ mode: "create", unbudgetedCategories })}
          disabled={loading}
        >
          <Plus />
          Add budget
        </Button>
      </div>

      {loadError ? (
        <FinanceErrorState
          title="Budgets unavailable"
          description="We couldn't load your budgets. Try again in a moment."
          onRetry={() => void budgets.refetch()}
        />
      ) : loading ? (
        <BudgetListSkeleton />
      ) : categories.length === 0 ? (
        <FinanceEmptyState
          icon={WalletCards}
          title="No expense categories yet"
          description="Add an expense category in Transactions before setting a budget."
        />
      ) : (
        <>
          <FinanceSection
            id="budgets-summary"
            title="Summary"
            description={`Standing category limits measured against ${monthLabel(monthOffset)} spending.`}
          >
            <BudgetSummary performance={performance} />
          </FinanceSection>

          <FinanceSection id="budgets-categories" title="Categories" description="Progress, remaining balance, and status for each budgeted category.">
            {performance.length === 0 ? (
              <FinanceEmptyState
                icon={WalletCards}
                title="No budgets set"
                description="Add a monthly limit for a category to start tracking budget health here."
                action={
                  <Button variant="outline" size="sm" onClick={() => setSheetTarget({ mode: "create", unbudgetedCategories })}>
                    <Plus />
                    Add budget
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {performance.map((budget) => (
                  <BudgetCard
                    key={budget.categoryId}
                    budget={budget}
                    onEdit={(target) => setSheetTarget({ mode: "edit", budget: target })}
                    onRemoveRequest={setRemoveTarget}
                  />
                ))}
              </div>
            )}
          </FinanceSection>
        </>
      )}

      <BudgetSheet
        target={sheetTarget}
        open={sheetTarget !== null}
        onOpenChange={(open) => !open && setSheetTarget(null)}
        onSave={handleSave}
      />

      <DeleteBudgetDialog
        isOpen={removeTarget !== null}
        isDeleting={removing}
        categoryName={removeTarget?.categoryName ?? ""}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
