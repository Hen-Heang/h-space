"use client"

import { RankedRow } from "@/components/finance/analytics/ranked-rows"
import { CategoryIcon } from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { rankedShares } from "@/lib/finance/analytics-display"
import type { CategoryAmount } from "@/types/finance"

/** Every expense category, largest first, with its share of the month's expenses. */
export function CategoryDistribution({ categories }: { categories: CategoryAmount[] }) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No expenses recorded. Category distribution appears once you log expenses this month.
      </p>
    )
  }

  const { rows } = rankedShares(categories, (category) => category.amountKrw)

  return (
    <RowList surface>
      {rows.map(({ item: category, amountKrw, sharePct }, index) => (
        <RankedRow
          key={category.categoryId ?? category.categoryName}
          rank={index + 1}
          leading={
            <CategoryIcon
              icon={category.categoryIcon}
              color={category.categoryColor}
              className="size-9 rounded-lg border-0 text-base"
            />
          }
          name={category.categoryName}
          amountKrw={amountKrw}
          sharePct={sharePct}
          barColor={category.categoryColor}
        />
      ))}
    </RowList>
  )
}
