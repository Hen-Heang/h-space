"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinanceEmptyState, FinanceErrorState, FinanceMetricGrid, FinanceSection } from "@/components/finance/ui/finance-primitives";
import { SavingsSummary } from "@/components/finance/savings/savings-summary";
import { SavingsGoalCard } from "@/components/finance/savings/savings-goal-card";
import { SavingsGoalSheet } from "@/components/finance/savings/savings-goal-sheet";
import { ContributionSheet } from "@/components/finance/savings/contribution-sheet";
import { DeleteSavingsGoalDialog } from "@/components/finance/savings/delete-savings-goal-dialog";
import {
  addSavingsContribution,
  createSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
} from "@/lib/api/finance";
import { savingsGoalsQuery, useInvalidateAfter } from "@/lib/query/finance-queries";
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@/lib/validation/finance";
import type { SavingsGoal } from "@/types/finance";

function SavingsListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading savings goals">
      <FinanceMetricGrid>
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-28 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </FinanceMetricGrid>
      <div className="space-y-3">
        {[0, 1].map((card) => (
          <div key={card} className="h-48 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function SavingsList() {
  const invalidateAfter = useInvalidateAfter();
  const savings = useQuery(savingsGoalsQuery);
  const goals = savings.data ?? [];
  const loading = savings.isPending;
  // A failed background refresh keeps the goals already on screen.
  const loadError = savings.isError && !savings.data;

  const [goalSheet, setGoalSheet] = useState<{ mode: "create" | "edit"; goal?: SavingsGoal } | null>(null);
  const [contributionTarget, setContributionTarget] = useState<SavingsGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Goal balances also feed the overview's Financial Health "Future" share.
  function refresh() {
    return invalidateAfter("savings");
  }

  async function handleSaveGoal(input: CreateSavingsGoalInput & UpdateSavingsGoalInput) {
    if (goalSheet?.mode === "edit" && goalSheet.goal) {
      await updateSavingsGoal(goalSheet.goal.id, input);
    } else {
      await createSavingsGoal(input);
    }
    refresh();
  }

  async function handleContribute(amountUsd: number) {
    if (!contributionTarget) return;
    await addSavingsContribution(contributionTarget.id, { amountUsd });
    refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSavingsGoal(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch {
      setDeleteError("Couldn't delete this goal. Try again in a moment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-5 text-muted-foreground">Build reserves for the goals that matter.</p>
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
          <FinanceSection id="savings-summary" title="Summary" description="Combined progress across every goal.">
            <SavingsSummary goals={goals} />
          </FinanceSection>

          <FinanceSection id="savings-goals" title="Goals" description="Progress, remaining balance, and target date for each goal.">
            <div className="space-y-3">
              {goals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  onContribute={setContributionTarget}
                  onEdit={(target) => setGoalSheet({ mode: "edit", goal: target })}
                  onDeleteRequest={setDeleteTarget}
                />
              ))}
            </div>
          </FinanceSection>
        </>
      )}

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
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
