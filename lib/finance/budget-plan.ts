import { krw } from "@/lib/finance-format";
import type {
  Budget,
  BudgetRecommendation,
  CategoryAmount,
  NextMonthBudgetPlan,
  SpendingClass,
} from "@/types/finance";

// Next-month budget plan, ported from Money Flow's adaptive budget engine.
// Deliberately conservative:
//  - Recommends one achievable step, never an aggressive target.
//  - Only trims categories the user explicitly classified as `flexible` or
//    `avoidable`. Unclassified categories are never trimmed, so family
//    support or education can't be treated as waste by default.
//  - Raises budgets that sit unrealistically far below actual spending.
// Nothing here writes data — applying a plan is a separate, confirmed request.

const REDUCTION_BY_CLASS: Record<SpendingClass, number> = {
  essential: 0,
  commitment: 0,
  growth: 0,
  flexible: 0.1,
  avoidable: 0.2,
};

// A budget this far below typical spending guarantees an "over budget" alert
// every month, so the plan raises it toward reality instead.
const UNREALISTIC_BUDGET_RATIO = 1.25;

export const PLAN_LOOKBACK_MONTHS = 3;

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Step that makes a recommendation read as a round number (₩380,000, not ₩378,412). */
export function budgetRoundingStep(value: number): number {
  if (value >= 100_000) return 10_000;
  if (value >= 10_000) return 1_000;
  return 500;
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The `count` months ending at (and including) `month`, oldest first. */
export function monthsEndingAt(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1));
}

interface CategorySpendHistory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  spendingClass: SpendingClass | null;
  monthlyKrw: number[];
}

// Months with no spend count as ₩0 — for a monthly budget an inactive month
// is real signal, not a gap. Uncategorized spending can't carry a budget.
function collectHistory(spendByMonth: CategoryAmount[][]): CategorySpendHistory[] {
  const byCategory = new Map<string, CategorySpendHistory>();

  spendByMonth.forEach((month, index) => {
    for (const entry of month) {
      if (!entry.categoryId) continue;
      const history = byCategory.get(entry.categoryId) ?? {
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        categoryIcon: entry.categoryIcon,
        categoryColor: entry.categoryColor,
        spendingClass: entry.spendingClass,
        monthlyKrw: spendByMonth.map(() => 0),
      };
      history.monthlyKrw[index] += entry.amountKrw;
      byCategory.set(entry.categoryId, history);
    }
  });

  return Array.from(byCategory.values());
}

function buildRecommendation(history: CategorySpendHistory, currentBudgetKrw: number): BudgetRecommendation {
  const months = history.monthlyKrw.length;
  const averageKrw = Math.round(history.monthlyKrw.reduce((sum, v) => sum + v, 0) / months);
  const medianKrw = Math.round(median(history.monthlyKrw));
  // Median resists one unusual month better than the mean, once there are
  // enough months for it to mean anything.
  const typical = months >= 3 ? medianKrw : averageKrw;
  const step = budgetRoundingStep(typical);
  const name = history.categoryName;
  const hasBudget = currentBudgetKrw > 0;

  let recommendedBudgetKrw: number;
  let reason: BudgetRecommendation["reason"];
  let rationale: string;

  const reductionPct = history.spendingClass ? REDUCTION_BY_CLASS[history.spendingClass] : 0;

  if (hasBudget && typical > currentBudgetKrw * UNREALISTIC_BUDGET_RATIO) {
    recommendedBudgetKrw = roundToStep(typical, step);
    reason = "raise_unrealistic";
    rationale =
      `${name} typically costs ${krw.format(typical)} a month, but the budget is ${krw.format(currentBudgetKrw)}. ` +
      `Raising it to ${krw.format(recommendedBudgetKrw)} reflects what it actually needs.`;
  } else if (reductionPct > 0) {
    recommendedBudgetKrw = roundToStep(typical * (1 - reductionPct), step);
    reason = "gradual_reduction";
    rationale =
      `${name} averaged ${krw.format(averageKrw)} over the last ${months} months. ` +
      `${krw.format(recommendedBudgetKrw)} is an achievable first step down.`;
  } else {
    recommendedBudgetKrw = roundToStep(typical, step);
    reason = hasBudget ? "hold_steady" : "first_budget";
    rationale = hasBudget
      ? `${name} has been steady around ${krw.format(typical)} a month. Keeping the budget close to that keeps it realistic.`
      : `${name} has no budget yet and typically costs ${krw.format(typical)} a month — a reasonable starting limit.`;
  }

  return {
    categoryId: history.categoryId,
    categoryName: name,
    categoryIcon: history.categoryIcon,
    categoryColor: history.categoryColor,
    spendingClass: history.spendingClass,
    currentBudgetKrw,
    averageKrw,
    medianKrw,
    recommendedBudgetKrw,
    reason,
    rationale,
  };
}

export interface BuildBudgetPlanInput {
  planMonth: string;
  /** Complete months analyzed, oldest first; parallel to the two arrays below. */
  months: string[];
  spendByMonth: CategoryAmount[][];
  incomeByMonth: number[];
  budgets: Budget[];
  targetSavingsRatePct: number;
}

export function buildBudgetPlan(input: BuildBudgetPlanInput): NextMonthBudgetPlan {
  const budgetByCategory = new Map(input.budgets.map((b) => [b.categoryId, b.amountKrw]));

  const recommendations = collectHistory(input.spendByMonth)
    .map((history) => buildRecommendation(history, budgetByCategory.get(history.categoryId) ?? 0))
    // Sporadic spending (one month out of three) has a median of ₩0; a ₩0
    // budget is never a useful suggestion, so those categories are left out.
    .filter((r) => r.recommendedBudgetKrw > 0)
    .sort((a, b) => b.averageKrw - a.averageKrw);

  const totalRecommendedKrw = recommendations.reduce((sum, r) => sum + r.recommendedBudgetKrw, 0);
  const averageIncomeKrw =
    input.incomeByMonth.length > 0
      ? Math.round(input.incomeByMonth.reduce((sum, v) => sum + v, 0) / input.incomeByMonth.length)
      : 0;

  const projectedSavingsRatePct =
    averageIncomeKrw > 0 ? Math.round(((averageIncomeKrw - totalRecommendedKrw) / averageIncomeKrw) * 100) : null;
  const targetSpendKrw = averageIncomeKrw * (1 - input.targetSavingsRatePct / 100);
  const additionalTrimNeededKrw = averageIncomeKrw > 0 ? Math.max(Math.round(totalRecommendedKrw - targetSpendKrw), 0) : 0;

  return {
    planMonth: input.planMonth,
    monthsAnalyzed: input.months,
    recommendations,
    totalRecommendedKrw,
    averageIncomeKrw,
    projectedSavingsRatePct,
    targetSavingsRatePct: input.targetSavingsRatePct,
    additionalTrimNeededKrw,
  };
}
