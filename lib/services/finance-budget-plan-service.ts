import "server-only";
import { Errors } from "@/lib/errors";
import { appMonth, monthStart, nextMonthStart } from "@/lib/finance-cron-time";
import { buildBudgetPlan, monthsEndingAt, PLAN_LOOKBACK_MONTHS, shiftMonth } from "@/lib/finance/budget-plan";
import { findBudgetsByUser, upsertBudgets } from "@/lib/repositories/finance-budget-repository";
import { findPreferences } from "@/lib/repositories/finance-preferences-repository";
import { sumExpenseByCategoryForRange, sumTotalsForRange } from "@/lib/repositories/finance-transaction-repository";
import type { NextMonthBudgetPlan } from "@/types/finance";

// A plan is only offered for the most recent complete month. Planning from an
// older review would overwrite today's budgets with stale history, and the
// month still in progress isn't complete enough to plan from.
export function isPlannableMonth(month: string, now: Date = new Date()): boolean {
  return shiftMonth(month, 1) === appMonth(now);
}

export async function getNextMonthPlan(userId: string, month: string): Promise<NextMonthBudgetPlan | null> {
  if (!isPlannableMonth(month)) return null;

  const months = monthsEndingAt(month, PLAN_LOOKBACK_MONTHS);
  const [spendByMonth, totalsByMonth, budgets, preferences] = await Promise.all([
    Promise.all(months.map((m) => sumExpenseByCategoryForRange(userId, monthStart(m), nextMonthStart(m)))),
    Promise.all(months.map((m) => sumTotalsForRange(userId, monthStart(m), nextMonthStart(m)))),
    findBudgetsByUser(userId),
    findPreferences(userId),
  ]);

  return buildBudgetPlan({
    planMonth: shiftMonth(month, 1),
    months,
    spendByMonth,
    incomeByMonth: totalsByMonth.map((t) => t.incomeKrw),
    budgets,
    targetSavingsRatePct: preferences.targetSavingsRate,
  });
}

/**
 * Applies the confirmed subset of a reviewed plan. The amounts are not taken
 * on trust: the plan is rebuilt server-side, and every requested change must
 * match both what it recommends right now and the budget the user was shown.
 * Checking the budget too catches an edit made elsewhere that happens to
 * leave the rounded recommendation unchanged. Either way, a stale review is
 * rejected rather than overwriting numbers the user never saw.
 */
export async function applyNextMonthPlan(
  userId: string,
  month: string,
  changes: { categoryId: string; amountKrw: number; currentBudgetKrw: number }[]
): Promise<{ applied: number }> {
  const plan = await getNextMonthPlan(userId, month);
  if (!plan) throw Errors.validation("A plan can only be applied from last month's review.");

  const byCategory = new Map(plan.recommendations.map((r) => [r.categoryId, r]));
  for (const change of changes) {
    const current = byCategory.get(change.categoryId);
    if (
      !current ||
      current.recommendedBudgetKrw !== change.amountKrw ||
      current.currentBudgetKrw !== change.currentBudgetKrw
    ) {
      throw Errors.conflict("This plan changed since you opened it. Reload the review and try again.");
    }
  }

  await upsertBudgets(
    userId,
    changes.map(({ categoryId, amountKrw }) => ({ categoryId, amountKrw }))
  );
  return { applied: changes.length };
}
