"use client"

import { CalendarClock, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/finance/base/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/finance/base/sheet"
import {
  AmountText,
  CategoryIcon,
  FinanceProgress,
} from "@/components/finance/ui/finance-primitives"
import { SAVINGS_PURPOSE_LABELS } from "@/components/finance/savings/savings-goal-sheet"
import { usd } from "@/lib/finance-format"
import { goalDeadline, goalProgress, goalRemainingLabel } from "@/lib/finance/savings-display"
import { cn } from "@/lib/utils"
import type { SavingsGoal } from "@/types/finance"

/**
 * The goal sheet a row opens: progress, purpose, target date and note, with
 * Add contribution as the one primary action and Edit / Delete beside it.
 * Each action closes this sheet and opens its own form or confirmation.
 */
export function SavingsGoalDetailSheet({
  goal,
  open,
  onOpenChange,
  onContribute,
  onEdit,
  onDeleteRequest,
}: {
  goal: SavingsGoal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContribute: (goal: SavingsGoal) => void
  onEdit: (goal: SavingsGoal) => void
  onDeleteRequest: (goal: SavingsGoal) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle className="pr-10 break-words">{goal?.name ?? "Savings goal"}</SheetTitle>
          <SheetDescription>
            {goal?.purpose ? SAVINGS_PURPOSE_LABELS[goal.purpose] : "Savings goal"}
          </SheetDescription>
        </SheetHeader>
        {open && goal && (
          <GoalDetails
            goal={goal}
            onContribute={onContribute}
            onEdit={onEdit}
            onDeleteRequest={onDeleteRequest}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function GoalDetails({
  goal,
  onContribute,
  onEdit,
  onDeleteRequest,
}: {
  goal: SavingsGoal
  onContribute: (goal: SavingsGoal) => void
  onEdit: (goal: SavingsGoal) => void
  onDeleteRequest: (goal: SavingsGoal) => void
}) {
  const progress = goalProgress(goal)
  const deadline = goalDeadline(goal)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="flex items-start gap-3">
          <CategoryIcon icon={goal.icon} color={goal.color} />
          <div className="min-w-0 flex-1">
            <p className="[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight tabular-nums">
              <AmountText value={usd.format(goal.currentUsd)} />
            </p>
            <p className="[overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
              of <AmountText value={usd.format(goal.targetUsd)} /> · {progress.pct}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <FinanceProgress value={progress.pct} label={`${goal.name} is ${progress.pct}% saved`} />
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm",
              progress.reached ? "font-medium text-success" : "text-muted-foreground",
            )}
          >
            {progress.reached && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
            {goalRemainingLabel(progress)}
          </p>
        </div>

        {(deadline || goal.note) && (
          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            {deadline && (
              <div>
                <dt className="text-muted-foreground">Target date</dt>
                <dd
                  className={cn(
                    "mt-0.5 flex items-center gap-1.5 font-medium",
                    deadline.overdue && "text-destructive",
                  )}
                >
                  <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                  {deadline.date}
                  {deadline.status ? ` · ${deadline.status}` : ""}
                </dd>
              </div>
            )}
            {goal.note && (
              <div>
                <dt className="text-muted-foreground">Note</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words">{goal.note}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button variant="outline" className="min-h-11" onClick={() => onEdit(goal)}>
            <Pencil aria-hidden="true" />
            Edit goal
          </Button>
          <Button
            variant="ghost"
            className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeleteRequest(goal)}
          >
            <Trash2 aria-hidden="true" />
            Delete goal
          </Button>
        </div>
      </div>

      <SheetFooter>
        <Button className="min-h-11 flex-1" onClick={() => onContribute(goal)}>
          <Plus aria-hidden="true" />
          Add contribution
        </Button>
      </SheetFooter>
    </div>
  )
}
