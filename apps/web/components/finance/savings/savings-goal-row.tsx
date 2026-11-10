"use client"

import { CheckCircle2 } from "lucide-react"
import {
  AmountText,
  CategoryIcon,
  FinanceProgress,
} from "@/components/finance/ui/finance-primitives"
import { usd } from "@/lib/finance-format"
import { goalDeadline, goalProgress } from "@/lib/finance/savings-display"
import { cn } from "@/lib/utils"
import type { SavingsGoal } from "@/types/finance"

/**
 * One goal as a row: name and "saved of target", the percent trailing, a
 * neutral bar underneath. The row opens the goal sheet, which holds Add
 * contribution, Edit and Delete plus the purpose and note.
 */
export function SavingsGoalRow({
  goal,
  onOpen,
}: {
  goal: SavingsGoal
  onOpen: (goal: SavingsGoal) => void
}) {
  const progress = goalProgress(goal)
  const deadline = goalDeadline(goal)

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(goal)}
        className="flex min-h-14 w-full min-w-0 items-start gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
      >
        <CategoryIcon
          icon={goal.icon}
          color={goal.color}
          className="mt-0.5 size-9 rounded-lg border-0 text-base"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 flex-1 break-words text-base font-medium leading-snug">
              {goal.name}
            </span>
            <span className="shrink-0 text-base font-semibold leading-snug tabular-nums">
              {progress.pct}%
            </span>
          </span>
          <span className="mt-0.5 block [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
            <AmountText value={usd.format(goal.currentUsd)} /> of{" "}
            <AmountText value={usd.format(goal.targetUsd)} />
          </span>
          {(progress.reached || deadline) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
              {progress.reached && (
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                  Target reached
                </span>
              )}
              {deadline && (
                <span
                  className={cn(deadline.overdue ? "text-destructive" : "text-muted-foreground")}
                >
                  Due {deadline.date}
                  {deadline.status ? ` · ${deadline.status}` : ""}
                </span>
              )}
            </span>
          )}
          <span className="mt-2 block">
            <FinanceProgress
              value={progress.pct}
              label={`${goal.name} is ${progress.pct}% saved`}
            />
          </span>
        </span>
      </button>
    </li>
  )
}
