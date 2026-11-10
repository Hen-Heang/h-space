"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { krw } from "@/lib/finance-format"
import { categoryChangeLabel, topCategoryChanges } from "@/lib/finance/review-display"
import { cn } from "@/lib/utils"
import type { CategoryComparison } from "@/types/finance"

/** The largest category swings as flat rows: this month, last month, and the change in words. */
export function ReviewCategoryChanges({
  categoryComparison,
}: {
  categoryComparison: CategoryComparison[]
}) {
  if (categoryComparison.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to compare yet. Category changes appear once you have spending in two consecutive
        months.
      </p>
    )
  }

  return (
    <RowList className="border-y border-border">
      {topCategoryChanges(categoryComparison).map((entry) => {
        const Icon = entry.deltaKrw > 0 ? ArrowUpRight : entry.deltaKrw < 0 ? ArrowDownRight : Minus
        const toneClass =
          entry.deltaKrw > 0
            ? "text-destructive"
            : entry.deltaKrw < 0
              ? "text-success"
              : "text-muted-foreground"
        return (
          <li
            key={entry.categoryId ?? entry.categoryName}
            className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-3"
          >
            <div className="min-w-0 flex-1 basis-40">
              <p className="break-words text-base font-medium leading-snug">{entry.categoryName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                {krw.format(entry.currentKrw)} · was {krw.format(entry.previousKrw)}
              </p>
            </div>
            <p
              className={cn(
                "ml-auto flex max-w-full items-center gap-1 [overflow-wrap:anywhere] text-sm font-medium tabular-nums",
                toneClass,
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {entry.deltaKrw === 0 ? (
                categoryChangeLabel(0)
              ) : (
                <AmountText value={categoryChangeLabel(entry.deltaKrw)} />
              )}
            </p>
          </li>
        )
      })}
    </RowList>
  )
}
