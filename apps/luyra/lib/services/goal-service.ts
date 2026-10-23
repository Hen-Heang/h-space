import "server-only";
import { Errors } from "@/lib/errors";
import {
  countActiveGoalsByUser,
  createGoal,
  deleteGoal,
  findActiveGoalsByUser,
  findGoalsByUser,
  updateGoal,
} from "@/lib/repositories/goal-repository";
import type { CreateGoalInput, GoalFilters, UpdateGoalInput } from "@/lib/validation/goal";
import type { Goal } from "@/types/goal";

export async function listGoals(userId: string, filters: GoalFilters): Promise<Goal[]> {
  return findGoalsByUser(userId, filters);
}

export async function addGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
  return createGoal(userId, input);
}

export async function editGoal(userId: string, id: string, input: UpdateGoalInput): Promise<Goal> {
  const goal = await updateGoal(id, userId, input);
  if (!goal) throw Errors.notFound("Goal");
  return goal;
}

export async function removeGoal(userId: string, id: string): Promise<void> {
  const deleted = await deleteGoal(id, userId);
  if (!deleted) throw Errors.notFound("Goal");
}

export async function listActiveGoalsForToday(userId: string, limit: number): Promise<Goal[]> {
  return findActiveGoalsByUser(userId, limit);
}

export async function countActiveGoals(userId: string): Promise<number> {
  return countActiveGoalsByUser(userId);
}
