"use client";

import { DonutChart } from "@/components/finance/analytics/donut-chart";
import { hashSeriesColor } from "@/lib/finance-chart-colors";
import type { CategoryAmount } from "@/types/finance";

const MAX_SLICES = 6;

function colorForCategory(category: CategoryAmount): string {
  return category.categoryColor ?? hashSeriesColor(category.categoryId ?? category.categoryName);
}

export function CategoryDonut({ categories }: { categories: CategoryAmount[] }) {
  const total = categories.reduce((sum, category) => sum + category.amountKrw, 0);
  const visible = categories.slice(0, MAX_SLICES);
  const overflowAmountKrw = categories.slice(MAX_SLICES).reduce((sum, category) => sum + category.amountKrw, 0);
  const slices = [
    ...visible.map((category) => ({
      key: category.categoryId ?? category.categoryName,
      label: category.categoryName,
      amountKrw: category.amountKrw,
      color: colorForCategory(category),
    })),
    ...(overflowAmountKrw > 0 ? [{ key: "other", label: "Other", amountKrw: overflowAmountKrw, color: "var(--muted-foreground)" }] : []),
  ];

  return <DonutChart slices={slices} totalKrw={total} ariaLabel="Expense share by category" />;
}
