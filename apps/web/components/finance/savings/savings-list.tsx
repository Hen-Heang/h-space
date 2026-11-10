"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PiggyBank, Plus } from "lucide-react"
import { Button } from "@/components/finance/base/button"
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceSection,
} from "@/components/finance/ui/finance-primitives"
import { RowList } from "@/components/ui/row-list"
import { SavingsSummary } from "@/components/finance/savings/savings-summary"
import { SavingsGoalRow } from "@/components/finance/savings/savings-goal-row"
import { SavingsGoalDetailSheet } from "@/components/finance/savings/savings-goal-detail-sheet"
import { SavingsGoalSheet } from "@/components/finance/savings/savings-goal-sheet"
import { ContributionSheet } from "@/components/finance/savings/contribution-sheet"
import { DeleteSavingsGoalDialog } from "@/components/finance/savings/delete-savings-goal-dialog"
import {
  addSavingsContribution,
  createSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
} from "@/lib/api/finance"
import { savingsGoalsQuery, useInvalidateAfter } from "@/lib/query/finance-queries"
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@/lib/validation/finance"
import type { SavingsGoal } from "@/types/finance"

function SavingsListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading savings goals">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-secondary motion-safe:animate-pulse" />
        <div className="h-2 rounded-full bg-secondary motion-safe:animate-pulse" />
      </div>
      <div className="app-surface divide-y divide-border overflow-hidden">
        {[0, 1].map((row) => (
          <div key={row} className="flex gap-3 px-3 py-3 sm:px-4">
            <div className="size-9 shrink-0 rounded-lg bg-secondary motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-secondary motion-safe:animate-pulse" />
              <div className="h-2 rounded-full bg-secondary motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SavingsList() {
  const invalidateAfter = useInvalidateAfter()
  const savings = useQuery(savingsGoalsQuery())
  const goals = savings.data ?? []
  const loading = savings.isPending
  // A failed background refresh keeps the goals already on screen.
  const loadError = savings.isError && !savings.data

  // The goal sheet tracks an id so it always shows the latest cached goal.
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null)
  const detailGoal = goals.find((goal) => goal.id === detailGoalId) ?? null
  const [goalSheet, setGoalSheet] = useState<{
    mode: "create" | "edit"
    goal?: SavingsGoal
  } | null>(null)
  const [contributionTarget, setContributionTarget] = useState<SavingsGoal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Goal balances also feed the overview's Financial Health "Future" share.
  function refresh() {
    return invalidateAfter("savings")
  }

  async function handleSaveGoal(input: CreateSavingsGoalInput & UpdateSavingsGoalInput) {
    if (goalSheet?.mode === "edit" && goalSheet.goal) {
      await updateSavingsGoal(goalSheet.goal.id, input)
    } else {
      await createSavingsGoal(input)
    }
    refresh()
  }

  async function handleContribute(amountUsd: number) {
    if (!contributionTarget) return
    await addSavingsContribution(contributionTarget.id, { amountUsd })
    refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSavingsGoal(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch {
      setDeleteError("Couldn't delete this goal. Try again in a moment.")
    } finally {
      setDeleting(false)
    }
  }

  // Each action in the goal sheet closes it and opens its own form or dialog.
  function fromGoalSheet(open: () => void) {
    setDetailGoalId(null)
    open()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-5 text-muted-foreground">
          Build reserves for the goals that matter.
        </p>
        <Button size="sm" className="min-h-11" onClick={() => setGoalSheet({ mode: "create" })}>
          <Plus />
          New goal
        </Button>
      </div>

      {loadError ? (
        <FinanceErrorState
          title="Savings unavailable"
          description="We couldn't load your savings goals. Try again in a moment."
          onRetry={() => void savings.refetch()}
        />
      ) : loading ? (
        <SavingsListSkeleton />
      ) : goals.length === 0 ? (
        <FinanceEmptyState
          icon={PiggyBank}
          title="No savings goals yet"
          description="Create one to start tracking progress toward something you're saving for."
          action={
            <Button variant="outline" size="sm" onClick={() => setGoalSheet({ mode: "create" })}>
              <Plus />
              New goal
            </Button>
          }
        />
      ) : (
        <>
          <SavingsSummary goals={goals} />

          <FinanceSection
            id="savings-goals"
            title="Goals"
            description="Select a goal to add a contribution, edit or delete it."
          >
            <RowList surface>
              {goals.map((goal) => (
                <SavingsGoalRow
                  key={goal.id}
                  goal={goal}
                  onOpen={(target) => setDetailGoalId(target.id)}
                />
              ))}
            </RowList>
          </FinanceSection>
        </>
      )}

      <SavingsGoalDetailSheet
        goal={detailGoal}
        open={detailGoal !== null}
        onOpenChange={(open) => !open && setDetailGoalId(null)}
        onContribute={(goal) => fromGoalSheet(() => setContributionTarget(goal))}
        onEdit={(goal) => fromGoalSheet(() => setGoalSheet({ mode: "edit", goal }))}
        onDeleteRequest={(goal) => fromGoalSheet(() => setDeleteTarget(goal))}
      />

      <SavingsGoalSheet
        mode={goalSheet?.mode ?? "create"}
        goal={goalSheet?.goal}
        open={goalSheet !== null}
        onOpenChange={(open) => !open && setGoalSheet(null)}
        onSave={handleSaveGoal}
      />

      <ContributionSheet
        goal={contributionTarget}
        open={contributionTarget !== null}
        onOpenChange={(open) => !open && setContributionTarget(null)}
        onSave={handleContribute}
      />

      <DeleteSavingsGoalDialog
        isOpen={deleteTarget !== null}
        isDeleting={deleting}
        goalName={deleteTarget?.name ?? ""}
        error={deleteError}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
