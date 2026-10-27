"use client";

import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import type { MonthTotals } from "@/types/finance";

export function ReviewSummaryCards({ totals }: { totals: MonthTotals }) {
  return (
    <FinanceMetricGrid>
      <FinanceMetricCard label="Income" value={krw.format(totals.totalIncomeKrw)} detail={`${totals.transactionCount} transactions`} icon={ArrowUpRight} tone="positive" />
      <FinanceMetricCard label="Expenses" value={krw.format(totals.totalExpenseKrw)} detail="Recorded this month" icon={ArrowDownRight} tone="expense" />
      <FinanceMetricCard
        label="Savings"
        value={krw.format(totals.netCashFlowKrw)}
        detail="Income kept after expenses"
        icon={Wallet}
        tone={totals.netCashFlowKrw > 0 ? "positive" : totals.netCashFlowKrw < 0 ? "expense" : "neutral"}
      />
      <FinanceMetricCard
        label="Savings rate"
        value={`${totals.savingsRatePct}%`}
        detail={totals.totalIncomeKrw > 0 ? "Share of income retained" : "Add income to calculate"}
        icon={PiggyBank}
        tone={totals.savingsRatePct >= 0 ? "positive" : "expense"}
      />
    </FinanceMetricGrid>
  );
}
