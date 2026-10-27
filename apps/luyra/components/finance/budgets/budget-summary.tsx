"use client";

import { Landmark, ReceiptText, Scale, TriangleAlert } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import type { BudgetPerformance } from "@/types/finance";

export function BudgetSummary({ performance }: { performance: BudgetPerformance[] }) {
  const totalBudgetKrw = performance.reduce((sum, budget) => sum + budget.budgetKrw, 0);
  const totalSpentKrw = performance.reduce((sum, budget) => sum + budget.spentKrw, 0);
  const remainingKrw = totalBudgetKrw - totalSpentKrw;
  const attentionCount = performance.filter((budget) => budget.status !== "ok").length;

  return (
    <FinanceMetricGrid>
      <FinanceMetricCard
        label="Total budget"
        value={krw.format(totalBudgetKrw)}
        detail={`${performance.length} categor${performance.length === 1 ? "y" : "ies"} budgeted`}
        icon={Landmark}
      />
      <FinanceMetricCard
        label="Total spent"
        value={krw.format(totalSpentKrw)}
        detail="Against budgeted categories"
        icon={ReceiptText}
        tone={totalBudgetKrw > 0 && totalSpentKrw > totalBudgetKrw ? "expense" : "neutral"}
      />
      <FinanceMetricCard
        label="Remaining"
        value={krw.format(remainingKrw)}
        detail={remainingKrw < 0 ? "Over budget this month" : "Left to spend this month"}
        icon={Scale}
        tone={remainingKrw < 0 ? "expense" : "positive"}
      />
      <FinanceMetricCard
        label="Needs attention"
        value={String(attentionCount)}
        detail={attentionCount > 0 ? "At or above watch threshold" : "All budgets healthy"}
        icon={TriangleAlert}
        tone={attentionCount > 0 ? "warning" : "positive"}
      />
    </FinanceMetricGrid>
  );
}
