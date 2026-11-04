"use client";

import { WalletCards } from "lucide-react";
import { CategoryDonut } from "@/components/finance/analytics/category-donut";
import { CategoryIcon, FinanceEmptyState, FinanceProgress } from "@/components/finance/ui/finance-primitives";
import { krw } from "@/lib/finance-format";
import type { CategoryAmount } from "@/types/finance";

export function CategoryDistribution({ categories }: { categories: CategoryAmount[] }) {
  if (categories.length === 0) {
    return (
      <FinanceEmptyState
        icon={WalletCards}
        title="No expenses recorded"
        description="Category distribution appears once you log expenses this month."
      />
    );
  }

  const total = categories.reduce((sum, category) => sum + category.amountKrw, 0);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b border-border p-4">
        <CategoryDonut categories={categories} />
      </div>
      <div className="divide-y divide-border">
        {categories.map((category) => {
          const share = total > 0 ? (category.amountKrw / total) * 100 : 0;
          return (
            <div key={category.categoryId ?? category.categoryName} className="p-4">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={category.categoryIcon} color={category.categoryColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-1 xs:flex-row xs:justify-between xs:gap-4">
                    <p className="truncate text-sm font-semibold">{category.categoryName}</p>
                    <p className="[overflow-wrap:anywhere] font-mono text-sm font-semibold tabular-nums">{krw.format(category.amountKrw)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{share.toFixed(0)}% of expenses</p>
                  <div className="mt-2">
                    <FinanceProgress value={share} label={`${category.categoryName} is ${share.toFixed(0)}% of expenses`} color={category.categoryColor} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
