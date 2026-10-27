"use client";

import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank } from "lucide-react";
import { FinanceMetricCard, FinanceMetricGrid } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import type { MonthTotals } from "@/types/finance";

function signedAmount(value: number): string {
  if (value > 0) return `+${krw.format(value)}`;
  return krw.format(value);
}

export function AnalyticsSummaryCards({ totals }: { totals: MonthTotals }) {
  return (
    <FinanceMetricGrid>
      <FinanceMetricCard label="Income" value={krw.format(totals.totalIncomeKrw)} detail={`${totals.transactionCount} transactions`} icon={ArrowUpRight} tone="positive" />
      <FinanceMetricCard label="Expenses" value={krw.format(totals.totalExpenseKrw)} detail="Recorded this month" icon={ArrowDownRight} tone="expense" />
      <FinanceMetricCard
        label="Net cash flow"
        value={signedAmount(totals.netCashFlowKrw)}
        detail="Income minus expenses"
        icon={Landmark}
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
