import "server-only";
import {
  deleteBudget as deleteBudgetRepo,
  findBudgetsByUser,
  upsertBudget as upsertBudgetRepo,
} from "@/lib/repositories/finance-budget-repository";
import { findCategoriesByUser } from "@/lib/repositories/finance-lookup-repository";
import { findPreferences } from "@/lib/repositories/finance-preferences-repository";
import { sumExpenseByCategoryForRange } from "@/lib/repositories/finance-transaction-repository";
import type { Budget, BudgetPerformance, Category, CategoryAmount, FinancePreferences } from "@/types/finance";

export interface BudgetThresholds {
  watchPct: number;
  nearLimitPct: number;
}

export const DEFAULT_BUDGET_THRESHOLDS: BudgetThresholds = { watchPct: 70, nearLimitPct: 90 };

export function toBudgetThresholds(preferences: FinancePreferences): BudgetThresholds {
  return { watchPct: preferences.budgetWatchThresholdPct, nearLimitPct: preferences.budgetNearLimitThresholdPct };
}

export async function listBudgetsForMonth(
  userId: string,
  start: string,
  end: string
): Promise<{
  categories: Category[];
  budgets: Budget[];
  spendByCategory: Record<string, number>;
  performance: BudgetPerformance[];
}> {
  const [categories, budgets, spend, preferences] = await Promise.all([
    findCategoriesByUser(userId),
    findBudgetsByUser(userId),
    sumExpenseByCategoryForRange(userId, start, end),
    findPreferences(userId),
  ]);

  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");
  const spendByCategory: Record<string, number> = {};
  for (const entry of spend) {
    if (entry.categoryId) spendByCategory[entry.categoryId] = entry.amountKrw;
  }

  return {
    categories: expenseCategories,
    budgets,
    spendByCategory,
    performance: toBudgetPerformance(budgets, spend, toBudgetThresholds(preferences)),
  };
}

export async function upsertBudget(userId: string, categoryId: string, amountKrw: number): Promise<void> {
  await upsertBudgetRepo(userId, categoryId, amountKrw);
}

export async function deleteBudget(userId: string, categoryId: string): Promise<void> {
  await deleteBudgetRepo(userId, categoryId);
}

function budgetUsageStatus(usagePct: number, thresholds: BudgetThresholds): BudgetPerformance["status"] {
  if (usagePct >= 100) return "exceeded";
  if (usagePct >= thresholds.nearLimitPct) return "near_limit";
  if (usagePct >= thresholds.watchPct) return "watch";
  return "ok";
}

export function toBudgetPerformance(
  budgets: Budget[],
  categorySpend: CategoryAmount[],
  thresholds: BudgetThresholds = DEFAULT_BUDGET_THRESHOLDS
): BudgetPerformance[] {
  const spendByCategory = new Map(categorySpend.map((s) => [s.categoryId, s.amountKrw]));

  return budgets
    .filter((b) => b.amountKrw > 0)
    .map((b) => {
      const spentKrw = spendByCategory.get(b.categoryId) ?? 0;
      const usagePct = b.amountKrw > 0 ? Math.round((spentKrw / b.amountKrw) * 100) : 0;
      return {
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        categoryIcon: b.categoryIcon,
        categoryColor: b.categoryColor,
        budgetKrw: b.amountKrw,
        spentKrw,
        remainingKrw: b.amountKrw - spentKrw,
        usagePct,
        overBudget: spentKrw > b.amountKrw,
        status: budgetUsageStatus(usagePct, thresholds),
      };
    })
    .sort((a, b) => b.usagePct - a.usagePct);
}

export async function computeBudgetPerformance(userId: string, start: string, end: string): Promise<BudgetPerformance[]> {
  const [budgets, spend, preferences] = await Promise.all([
    findBudgetsByUser(userId),
    sumExpenseByCategoryForRange(userId, start, end),
    findPreferences(userId),
  ]);
  return toBudgetPerformance(budgets, spend, toBudgetThresholds(preferences));
}
