import "server-only";
import { sumExpenseByCategoryForRange, sumTotalsForRange } from "@/lib/repositories/finance-transaction-repository";
import { computeBudgetPerformance } from "@/lib/services/finance-budget-service";
import { getReviewSummary, monthBounds } from "@/lib/services/finance-analytics-service";
import { getSavingsProgress } from "@/lib/services/finance-savings-service";
import { listDetectedSubscriptions } from "@/lib/services/finance-subscription-service";
import type { MonthlyReport, ReportCategoryAmount, WeeklySummary } from "@/types/finance";

function seoulToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

async function getSubscriptionsMonthlyKrw(userId: string): Promise<number> {
  const subscriptions = await listDetectedSubscriptions(userId);
  return subscriptions.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + Math.round(s.estimatedYearlyCostKrw / 12), 0);
}

// The trailing 7 days ending yesterday (Asia/Seoul), not a Mon-Sun calendar
// week — a rolling window is well-defined regardless of what day it runs on.
export async function getWeeklySummary(userId: string, referenceDateStr?: string): Promise<WeeklySummary> {
  const today = referenceDateStr ?? seoulToday();
  const weekEndExclusive = today;
  const weekEnd = addDays(today, -1);
  const weekStart = addDays(today, -7);
  const previousWeekStart = addDays(weekStart, -7);

  const [totalsRaw, previousTotalsRaw, categories, savingsProgress, subscriptionsMonthlyKrw] = await Promise.all([
    sumTotalsForRange(userId, weekStart, weekEndExclusive),
    sumTotalsForRange(userId, previousWeekStart, weekStart),
    sumExpenseByCategoryForRange(userId, weekStart, weekEndExclusive),
    getSavingsProgress(userId),
    getSubscriptionsMonthlyKrw(userId),
  ]);

  // Budget warnings are checked against the current month's standing budgets
  // (budgets are monthly, not weekly) — a mid-month snapshot, not a weekly limit.
  const { start: monthStart, end: monthEnd } = monthBounds(weekEnd.slice(0, 7));
  const budgetPerformance = await computeBudgetPerformance(userId, monthStart, monthEnd);

  const totalExpenseKrw = totalsRaw.expenseKrw;
  const topCategories: ReportCategoryAmount[] = categories.slice(0, 3).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    amountKrw: c.amountKrw,
    pctOfTotal: totalExpenseKrw > 0 ? Math.round((c.amountKrw / totalExpenseKrw) * 100) : 0,
  }));

  return {
    weekStart,
    weekEnd,
    incomeKrw: totalsRaw.incomeKrw,
    expenseKrw: totalsRaw.expenseKrw,
    netCashFlowKrw: totalsRaw.incomeKrw - totalsRaw.expenseKrw,
    previousWeekExpenseKrw: previousTotalsRaw.expenseKrw,
    expenseChangePct: percentChange(totalsRaw.expenseKrw, previousTotalsRaw.expenseKrw),
    topCategories,
    budgetWarnings: budgetPerformance.filter((b) => b.status !== "ok"),
    savingsProgress,
    subscriptionsMonthlyKrw,
  };
}

// Composes the already-deterministic Review data rather than re-deriving the
// same month's totals a second time — Review and the Monthly Report must
// never disagree on a number, so they share one computation.
export async function getMonthlyReport(userId: string, month: string): Promise<MonthlyReport> {
  const review = await getReviewSummary(userId, month);
  const totalExpenseKrw = review.totals.totalExpenseKrw;

  const topCategories: ReportCategoryAmount[] = [...review.categoryComparison]
    .sort((a, b) => b.currentKrw - a.currentKrw)
    .slice(0, 3)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      amountKrw: c.currentKrw,
      pctOfTotal: totalExpenseKrw > 0 ? Math.round((c.currentKrw / totalExpenseKrw) * 100) : 0,
    }));

  return {
    month: review.month,
    totals: review.totals,
    previousTotals: review.previousTotals,
    topCategories,
    categoryComparison: review.categoryComparison,
    budgetPerformance: review.budgetPerformance,
    subscriptionsMonthlyKrw: review.subscriptionsMonthlyKrw,
    savingsProgress: review.savingsProgress,
    observations: review.observations,
  };
}
