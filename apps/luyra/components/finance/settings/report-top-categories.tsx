"use client";

import { krw } from "@/lib/finance-format";
import type { ReportCategoryAmount } from "@/types/finance";

export function ReportTopCategories({ categories }: { categories: ReportCategoryAmount[] }) {
  if (categories.length === 0) {
    return <p className="text-xs text-muted-foreground">No expenses recorded for this period.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="divide-y divide-border">
        {categories.map((category) => (
          <div key={category.categoryId ?? category.categoryName} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{category.categoryName}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{category.pctOfTotal}%</span>
              <span className="font-mono font-medium tabular-nums">{krw.format(category.amountKrw)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
