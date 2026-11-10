"use client"

import { RowList } from "@/components/ui/row-list"
import { krw } from "@/lib/finance-format"
import type { ReportCategoryAmount } from "@/types/finance"

export function ReportTopCategories({ categories }: { categories: ReportCategoryAmount[] }) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses recorded for this period.</p>
  }

  return (
    <RowList className="border-y border-border">
      {categories.map((category) => (
        <li
          key={category.categoryId ?? category.categoryName}
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5"
        >
          <span className="min-w-0 flex-1 basis-32 break-words text-base">
            {category.categoryName}
          </span>
          <span className="ml-auto flex shrink-0 items-baseline gap-2 tabular-nums">
            <span className="text-sm text-muted-foreground">{category.pctOfTotal}%</span>
            <span className="text-base font-medium">{krw.format(category.amountKrw)}</span>
          </span>
        </li>
      ))}
    </RowList>
  )
}
