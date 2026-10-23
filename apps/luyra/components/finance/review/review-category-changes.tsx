"use client";

import { ArrowDownRight, ArrowUpRight, Minus, TrendingUpDown } from "lucide-react";
import { FinanceEmptyState } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { CategoryComparison } from "@/types/finance";

export function ReviewCategoryChanges({ categoryComparison }: { categoryComparison: CategoryComparison[] }) {
  if (categoryComparison.length === 0) {
    return (
      <FinanceEmptyState icon={TrendingUpDown} title="Nothing to compare yet" description="Category changes appear once you have spending in two consecutive months." />
    );
  }

  const sorted = [...categoryComparison].sort((a, b) => Math.abs(b.deltaKrw) - Math.abs(a.deltaKrw)).slice(0, 8);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="divide-y divide-border">
        {sorted.map((entry) => {
          const Icon = entry.deltaKrw > 0 ? ArrowUpRight : entry.deltaKrw < 0 ? ArrowDownRight : Minus;
          const toneClass = entry.deltaKrw > 0 ? "text-destructive" : entry.deltaKrw < 0 ? "text-success" : "text-muted-foreground";
          return (
            <div key={entry.categoryId ?? entry.categoryName} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{entry.categoryName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {krw.format(entry.currentKrw)} · was {krw.format(entry.previousKrw)}
                </p>
              </div>
              <span className={cn("flex max-w-full items-center gap-1 [overflow-wrap:anywhere] font-mono text-xs font-semibold tabular-nums", toneClass)}>
                <Icon className="size-3.5" aria-hidden="true" />
                {entry.deltaKrw === 0 ? "No change" : `${entry.deltaKrw > 0 ? "+" : ""}${krw.format(entry.deltaKrw)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
