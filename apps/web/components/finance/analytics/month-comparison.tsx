"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { krw } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { MonthTotals } from "@/types/finance";

function DeltaPill({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const diff = current - previous;
  const pct = previous !== 0 ? Math.round((diff / Math.abs(previous)) * 100) : null;

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" />
        No change
      </span>
    );
  }

  const improved = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", improved ? "text-success" : "text-destructive")}>
      <Icon className="size-3" aria-hidden="true" />
      {pct !== null ? `${Math.abs(pct)}%` : krw.format(Math.abs(diff))}
    </span>
  );
}

export function MonthComparison({
  monthLabel,
  previousMonthLabel,
  totals,
  previousTotals,
}: {
  monthLabel: string;
  previousMonthLabel: string;
  totals: MonthTotals;
  previousTotals: MonthTotals;
}) {
  const rows: { label: string; current: number; previous: number; invert: boolean }[] = [
    { label: "Income", current: totals.totalIncomeKrw, previous: previousTotals.totalIncomeKrw, invert: false },
    { label: "Expenses", current: totals.totalExpenseKrw, previous: previousTotals.totalExpenseKrw, invert: true },
    { label: "Net cash flow", current: totals.netCashFlowKrw, previous: previousTotals.netCashFlowKrw, invert: false },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between px-4 pt-4 text-xs text-muted-foreground">
        <span>{monthLabel}</span>
        <span>vs {previousMonthLabel}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{krw.format(row.previous)} last month</p>
            </div>
            <div className="max-w-full text-right">
              <p className="[overflow-wrap:anywhere] font-mono text-sm font-semibold tabular-nums">{krw.format(row.current)}</p>
              <div className="mt-0.5">
                <DeltaPill current={row.current} previous={row.previous} invert={row.invert} />
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-medium">Savings rate</p>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm font-semibold tabular-nums">{totals.savingsRatePct}%</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{previousTotals.savingsRatePct}% last month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
