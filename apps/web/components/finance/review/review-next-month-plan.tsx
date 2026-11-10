"use client"

import { useMemo, useState } from "react"
import { Check, CheckCircle2, Loader2, Scale } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/finance/base/alert-dialog"
import { Button } from "@/components/finance/base/button"
import { CategoryIcon, FinanceEmptyState } from "@/components/finance/ui/finance-primitives"
import { ApiError } from "@/lib/api/finance-client"
import { applyBudgetPlan } from "@/lib/api/finance"
import { monthKeyLabel } from "@/lib/finance-cron-time"
import { krw } from "@/lib/finance-format"
import { useInvalidateAfter } from "@/lib/query/finance-queries"
import { cn } from "@/lib/utils"
import type { BudgetRecommendation, NextMonthBudgetPlan } from "@/types/finance"

function isChange(recommendation: BudgetRecommendation): boolean {
  return recommendation.recommendedBudgetKrw !== recommendation.currentBudgetKrw
}

function signedKrw(value: number): string {
  return `${value > 0 ? "+" : ""}${krw.format(value)}`
}

// Nothing is written until the user selects budgets and confirms. The server
// re-derives the plan on apply and rejects it if the numbers moved meanwhile.
export function ReviewNextMonthPlan({
  month,
  plan,
  appliedCount,
  onApplied,
}: {
  month: string
  plan: NextMonthBudgetPlan
  appliedCount: number | null
  onApplied: (count: number) => void
}) {
  // Pre-select every recommendation that actually changes a budget, so the
  // user reviews a concrete plan rather than an empty list.
  const [selected, setSelected] = useState(
    () => new Set(plan.recommendations.filter(isChange).map((r) => r.categoryId)),
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invalidateAfter = useInvalidateAfter()

  const selectedRecommendations = useMemo(
    () => plan.recommendations.filter((r) => selected.has(r.categoryId)),
    [plan, selected],
  )
  const selectedTotalKrw = selectedRecommendations.reduce(
    (sum, r) => sum + r.recommendedBudgetKrw,
    0,
  )

  function toggle(categoryId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  async function handleApply() {
    setApplying(true)
    setError(null)
    try {
      const result = await applyBudgetPlan({
        month,
        changes: selectedRecommendations.map((r) => ({
          categoryId: r.categoryId,
          amountKrw: r.recommendedBudgetKrw,
          currentBudgetKrw: r.currentBudgetKrw,
        })),
      })
      setConfirmOpen(false)
      // Budgets are standing limits: the Budgets screen and the overview's
      // alerts and daily guide are all stale now.
      void invalidateAfter("budget")
      onApplied(result.applied)
    } catch (err) {
      setConfirmOpen(false)
      setError(
        err instanceof ApiError && err.code === "CONFLICT"
          ? err.message
          : "We couldn't apply the plan. Your budgets were not changed — try again in a moment.",
      )
    } finally {
      setApplying(false)
    }
  }

  if (plan.recommendations.length === 0) {
    return (
      <FinanceEmptyState
        icon={Scale}
        title="Not enough history yet"
        description="Categorized spending over the last few months is needed to suggest next month's budgets."
      />
    )
  }

  const changeCount = plan.recommendations.filter(isChange).length

  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Based on {plan.monthsAnalyzed.map(monthKeyLabel).join(", ")}. Only categories you marked
          Flexible or Avoidable are trimmed, and only by a small step.
        </p>
        {plan.projectedSavingsRatePct !== null && (
          <>
            <p className="text-base text-foreground">
              Following every suggestion leaves a projected savings rate of{" "}
              <span className="font-semibold tabular-nums">{plan.projectedSavingsRatePct}%</span>{" "}
              against your <span className="tabular-nums">{plan.targetSavingsRatePct}%</span>{" "}
              target.
            </p>
            {plan.otherSpendingKrw > 0 && (
              <p>
                Includes about {krw.format(plan.otherSpendingKrw)} a month of uncategorized or
                occasional spending that no budget covers.
              </p>
            )}
            {plan.additionalTrimNeededKrw > 0 && (
              <p>
                Reaching the target would take about {krw.format(plan.additionalTrimNeededKrw)} more
                in cuts — that&apos;s information only; nothing is trimmed for you.
              </p>
            )}
          </>
        )}
      </div>

      {appliedCount !== null && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Updated {appliedCount} {appliedCount === 1 ? "budget" : "budgets"} for{" "}
          {monthKeyLabel(plan.planMonth)}.
        </p>
      )}

      {error && (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <ul className="divide-y divide-border border-y border-border">
        {plan.recommendations.map((rec) => {
          const changed = isChange(rec)
          const delta = rec.recommendedBudgetKrw - rec.currentBudgetKrw
          const inputId = `plan-${rec.categoryId}`
          return (
            <li key={rec.categoryId}>
              <label
                htmlFor={inputId}
                className={cn("flex min-h-14 gap-3 py-3", changed && "cursor-pointer")}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={selected.has(rec.categoryId)}
                  disabled={!changed || applying}
                  onChange={() => toggle(rec.categoryId)}
                  className="mt-2 size-5 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  aria-label={`Apply new budget for ${rec.categoryName}`}
                />
                <CategoryIcon
                  icon={rec.categoryIcon}
                  color={rec.categoryColor}
                  className="size-9 rounded-lg border-0 text-base"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 flex-1 basis-32 break-words text-base font-medium leading-snug">
                      {rec.categoryName}
                    </span>
                    <span className="ml-auto [overflow-wrap:anywhere] text-right text-base tabular-nums">
                      {rec.currentBudgetKrw > 0 && changed && (
                        <span className="mr-2 text-sm text-muted-foreground line-through">
                          <span className="sr-only">was </span>
                          {krw.format(rec.currentBudgetKrw)}
                        </span>
                      )}
                      <span className="font-semibold">{krw.format(rec.recommendedBudgetKrw)}</span>
                      {changed && (
                        <span
                          className={cn(
                            "ml-1.5 text-sm",
                            delta < 0 ? "text-success" : "text-warning",
                          )}
                        >
                          {signedKrw(delta)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {changed ? rec.rationale : "Already matches your budget — nothing to change."}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {/* The Review's one primary action. */}
      <Button
        className="min-h-11 w-full sm:w-auto"
        onClick={() => setConfirmOpen(true)}
        disabled={selectedRecommendations.length === 0 || applying || changeCount === 0}
      >
        <Check className="size-4" aria-hidden="true" />
        Apply plan for {monthKeyLabel(plan.planMonth)}
        {selectedRecommendations.length > 0 && ` (${selectedRecommendations.length})`}
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !open && !applying && setConfirmOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply next month&apos;s plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This updates {selectedRecommendations.length}{" "}
              {selectedRecommendations.length === 1 ? "budget" : "budgets"}, totalling{" "}
              {krw.format(selectedTotalKrw)} a month. Transactions and savings goals are not
              affected, and you can change any budget again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={() => handleApply()} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Applying...
                </>
              ) : (
                "Apply plan"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
