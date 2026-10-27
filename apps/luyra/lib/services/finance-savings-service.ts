import "server-only";
import { Errors } from "@/lib/errors";
import {
  addContribution as addContributionRepo,
  createSavingsGoal as createSavingsGoalRepo,
  deleteSavingsGoal as deleteSavingsGoalRepo,
  findContributionsByGoal,
  findSavingsGoalById,
  findSavingsGoalsByUser,
  updateSavingsGoal as updateSavingsGoalRepo,
} from "@/lib/repositories/finance-savings-repository";
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@/lib/validation/finance";
import type { SavingsContribution, SavingsGoal, SavingsProgress } from "@/types/finance";

export async function listSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  return findSavingsGoalsByUser(userId);
}

// Shared by Review and the Weekly/Monthly reports — one savings-progress
// calculation, computed once from already-loaded goals.
export function computeSavingsProgress(goals: SavingsGoal[]): SavingsProgress {
  const totalSavedUsd = goals.reduce((sum, goal) => sum + goal.currentUsd, 0);
  const totalTargetUsd = goals.reduce((sum, goal) => sum + goal.targetUsd, 0);
  return {
    totalSavedUsd,
    totalTargetUsd,
    overallPct: totalTargetUsd > 0 ? Math.round((totalSavedUsd / totalTargetUsd) * 100) : 0,
    goalsCount: goals.length,
    goalsReachedCount: goals.filter((goal) => goal.targetUsd > 0 && goal.currentUsd >= goal.targetUsd).length,
  };
}

export async function getSavingsProgress(userId: string): Promise<SavingsProgress> {
  return computeSavingsProgress(await findSavingsGoalsByUser(userId));
}

export async function addSavingsGoal(userId: string, input: CreateSavingsGoalInput): Promise<SavingsGoal> {
  return createSavingsGoalRepo(userId, input);
}

export async function editSavingsGoal(userId: string, id: string, input: UpdateSavingsGoalInput): Promise<SavingsGoal> {
  const goal = await updateSavingsGoalRepo(id, userId, input);
  if (!goal) throw Errors.notFound("Savings goal");
  return goal;
}

export async function removeSavingsGoal(userId: string, id: string): Promise<void> {
  const deleted = await deleteSavingsGoalRepo(id, userId);
  if (!deleted) throw Errors.notFound("Savings goal");
}

export async function listContributions(userId: string, goalId: string): Promise<SavingsContribution[]> {
  const goal = await findSavingsGoalById(goalId, userId);
  if (!goal) throw Errors.notFound("Savings goal");
  return findContributionsByGoal(goalId, userId);
}

export async function addSavingsContribution(userId: string, goalId: string, amountUsd: number): Promise<SavingsContribution> {
  const goal = await findSavingsGoalById(goalId, userId);
  if (!goal) throw Errors.notFound("Savings goal");
  return addContributionRepo(goalId, userId, amountUsd);
}
