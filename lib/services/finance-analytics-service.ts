import "server-only";
import {
  findRecentTransactionsByUser,
  sumByDayForRange,
  sumExpenseByCategoryForRange,
  sumExpenseByDayForRange,
  sumExpenseByPaymentMethodForRange,
  sumTotalsForRange,
} from "@/lib/repositories/finance-transaction-repository";
import { findBudgetsByUser } from "@/lib/repositories/finance-budget-repository";
import { findPreferences } from "@/lib/repositories/finance-preferences-repository";
import { findContributionsForUser, findSavingsGoalsByUser } from "@/lib/repositories/finance-savings-repository";
import { computeBudgetPerformance, toBudgetPerformance, toBudgetThresholds } from "@/lib/services/finance-budget-service";
import { getNextMonthPlan } from "@/lib/services/finance-budget-plan-service";
import { getUsdToKrwRate } from "@/lib/services/finance-exchange-rate-service";
import { computeSavingsProgress } from "@/lib/services/finance-savings-service";
import { listDetectedSubscriptions } from "@/lib/services/finance-subscription-service";
import { computeFinancialHealth, toMoneyRule } from "@/lib/finance/financial-health";
import { sumContributionsForMonth } from "@/lib/finance/savings-contributions";
import type {
  AnalyticsSummary,
  BudgetHealth,
  BudgetPerformance,
  CategoryComparison,
  DailyBudgetGuide,
  DailyFlowPoint,
  DailySpendingPoint,
  FinanceOverviewSummary,
  MonthTotals,
  ReviewObservation,
  ReviewSummary,
  SavingsRateHealth,
} from "@/types/finance";

export function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split("-").map(Number);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return {
    start: `${year}-${String(m).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

function previousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

function currentSeoulDate(): { date: string; month: string; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const month = `${value.year}-${value.month}`;
  return { date: `${month}-${value.day}`, month, day: Number(value.day) };
}

function fillDailySpending(month: string, rows: DailySpendingPoint[]): DailySpendingPoint[] {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const amountByDate = new Map(rows.map((row) => [row.date, row.amountKrw]));

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { date, amountKrw: amountByDate.get(date) ?? 0 };
  });
}

function toDailyBudgetGuide(
  month: string,
  totals: MonthTotals,
  budgetTotalKrw: number,
  dailySpending: DailySpendingPoint[]
): DailyBudgetGuide | null {
  const today = currentSeoulDate();
  if (today.month !== month || budgetTotalKrw <= 0) return null;

  const spentTodayKrw = dailySpending.find((point) => point.date === today.date)?.amountKrw ?? 0;
  const daysRemaining = Math.max(dailySpending.length - today.day + 1, 1);
  const monthlyRemainingKrw = budgetTotalKrw - totals.totalExpenseKrw;
  const availablePerDayKrw = Math.round(monthlyRemainingKrw / daysRemaining);
  const baselinePerDayKrw = budgetTotalKrw / dailySpending.length;
  const status = monthlyRemainingKrw < 0
    ? "over"
    : availablePerDayKrw < baselinePerDayKrw * 0.3
      ? "watch"
      : "healthy";

  return {
    totalBudgetKrw: budgetTotalKrw,
    spentTodayKrw,
    availablePerDayKrw,
    monthlyRemainingKrw,
    daysRemaining,
    status,
  };
}

function fillDailyFlow(month: string, rows: { date: string; incomeKrw: number; expenseKrw: number }[]): DailyFlowPoint[] {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const byDate = new Map(rows.map((row) => [row.date, row]));

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const found = byDate.get(date);
    return { date, incomeKrw: found?.incomeKrw ?? 0, expenseKrw: found?.expenseKrw ?? 0 };
  });
}

function toMonthTotals(raw: {
  incomeKrw: number;
  expenseKrw: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
}): MonthTotals {
  const net = raw.incomeKrw - raw.expenseKrw;
  const savingsRatePct = raw.incomeKrw > 0 ? Math.round((net / raw.incomeKrw) * 100) : 0;
  return {
    totalIncomeKrw: raw.incomeKrw,
    totalExpenseKrw: raw.expenseKrw,
    netCashFlowKrw: net,
    savingsRatePct,
    transactionCount: raw.count,
    incomeTransactionCount: raw.incomeCount,
    expenseTransactionCount: raw.expenseCount,
  };
}

function toSavingsRateHealth(totals: MonthTotals, targetRatePct: number): SavingsRateHealth {
  if (totals.totalIncomeKrw <= 0) {
    return { targetRatePct, deltaPct: null, status: "unavailable" };
  }

  const deltaPct = totals.savingsRatePct - targetRatePct;
  return {
    targetRatePct,
    deltaPct,
    status: deltaPct > 0 ? "above" : deltaPct < 0 ? "below" : "on_target",
  };
}

function toBudgetHealth(performance: BudgetPerformance[]): BudgetHealth | null {
  if (performance.length === 0) return null;

  const totalBudgetKrw = performance.reduce((sum, budget) => sum + budget.budgetKrw, 0);
  const totalSpentKrw = performance.reduce((sum, budget) => sum + budget.spentKrw, 0);
  const rawUsagePct = totalBudgetKrw > 0 ? Math.round((totalSpentKrw / totalBudgetKrw) * 100) : 0;
  const statusOrder: BudgetPerformance["status"][] = ["exceeded", "near_limit", "watch", "ok"];
  const status = statusOrder.find((candidate) => performance.some((budget) => budget.status === candidate)) ?? "ok";

  return {
    totalBudgetKrw,
    totalSpentKrw,
    remainingKrw: totalBudgetKrw - totalSpentKrw,
    usagePct: Number.isFinite(rawUsagePct) ? Math.max(rawUsagePct, 0) : 0,
    status,
    attentionCount: performance.filter((budget) => budget.status !== "ok").length,
  };
}

export async function getAnalyticsSummary(userId: string, month: string): Promise<AnalyticsSummary> {
  const { start, end } = monthBounds(month);
  const prevMonth = previousMonth(month);
  const { start: prevStart, end: prevEnd } = monthBounds(prevMonth);

  const [totalsRaw, prevTotalsRaw, categories, paymentMethods, dailyRows] = await Promise.all([
    sumTotalsForRange(userId, start, end),
    sumTotalsForRange(userId, prevStart, prevEnd),
    sumExpenseByCategoryForRange(userId, start, end),
    sumExpenseByPaymentMethodForRange(userId, start, end),
    sumByDayForRange(userId, start, end),
  ]);

  return {
    month,
    totals: toMonthTotals(totalsRaw),
    previousMonth: prevMonth,
    previousTotals: toMonthTotals(prevTotalsRaw),
    categories,
    paymentMethods,
    dailyTrend: fillDailyFlow(month, dailyRows),
  };
}

export async function getFinanceOverviewSummary(userId: string, month: string): Promise<FinanceOverviewSummary> {
  const { start, end } = monthBounds(month);
  const [totalsRaw, categories, dailyRows, budgets, recentTransactions, preferences, contributions, exchangeRate] =
    await Promise.all([
      sumTotalsForRange(userId, start, end),
      sumExpenseByCategoryForRange(userId, start, end),
      sumExpenseByDayForRange(userId, start, end),
      findBudgetsByUser(userId),
      findRecentTransactionsByUser(userId, start, end),
      findPreferences(userId),
      findContributionsForUser(userId),
      getUsdToKrwRate(),
    ]);
  const totals = toMonthTotals(totalsRaw);
  const dailySpending = fillDailySpending(month, dailyRows);
  const budgetPerformance = toBudgetPerformance(budgets, categories, toBudgetThresholds(preferences));
  const budgetTotalKrw = budgetPerformance.reduce((sum, budget) => sum + budget.budgetKrw, 0);
  const moneyRule = toMoneyRule(preferences.essentialTargetPct, preferences.targetSavingsRate);
  // Month-scoped, never the goal's cumulative total — see
  // sumContributionsForMonth's double-counting note.
  const futureContributionsKrw = Math.round(sumContributionsForMonth(contributions, month) * exchangeRate.rate);

  return {
    month,
    totals,
    savingsHealth: toSavingsRateHealth(totals, preferences.targetSavingsRate),
    budgetHealth: toBudgetHealth(budgetPerformance),
    financialHealth: computeFinancialHealth(
      month,
      totals.totalIncomeKrw,
      totals.totalExpenseKrw,
      categories,
      moneyRule,
      futureContributionsKrw
    ),
    categories,
    dailySpending,
    dailyBudget: toDailyBudgetGuide(month, totals, budgetTotalKrw, dailySpending),
    budgetPerformance,
    recentTransactions,
  };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// Deterministic, domain-computed observations shown before any AI copy.
// Never send these calculations to an LLM — see AGENTS.md's AI Finance rule.
export function buildReviewObservations(
  totals: MonthTotals,
  previousTotals: MonthTotals,
  categoryComparison: CategoryComparison[],
  budgetPerformance: BudgetPerformance[]
): ReviewObservation[] {
  const observations: ReviewObservation[] = [];

  const swings = categoryComparison
    .filter((c) => c.previousKrw > 0)
    .map((c) => ({ ...c, changePct: percentChange(c.currentKrw, c.previousKrw) }))
    .filter((c): c is CategoryComparison & { changePct: number } => c.changePct !== null && Math.abs(c.changePct) >= 15);

  const increases = swings.filter((c) => c.changePct > 0).sort((a, b) => b.deltaKrw - a.deltaKrw).slice(0, 2);
  const decreases = swings.filter((c) => c.changePct < 0).sort((a, b) => a.deltaKrw - b.deltaKrw).slice(0, 2);

  for (const c of increases) {
    observations.push({
      id: `category-up-${c.categoryId ?? c.categoryName}`,
      tone: "warning",
      text: `${c.categoryName} spending increased ${c.changePct}% from last month.`,
    });
  }
  for (const c of decreases) {
    observations.push({
      id: `category-down-${c.categoryId ?? c.categoryName}`,
      tone: "positive",
      text: `${c.categoryName} spending fell ${Math.abs(c.changePct)}% from last month.`,
    });
  }

  const exceededCount = budgetPerformance.filter((b) => b.status === "exceeded").length;
  if (exceededCount > 0) {
    observations.push({
      id: "budgets-exceeded",
      tone: "warning",
      text: `${exceededCount} budget${exceededCount === 1 ? "" : "s"} ${exceededCount === 1 ? "was" : "were"} exceeded this month.`,
    });
  } else if (budgetPerformance.length > 0) {
    observations.push({ id: "budgets-ok", tone: "positive", text: "All budgets stayed within their limits this month." });
  }

  if (totals.totalIncomeKrw > 0 && previousTotals.totalIncomeKrw > 0 && totals.savingsRatePct !== previousTotals.savingsRatePct) {
    const improved = totals.savingsRatePct > previousTotals.savingsRatePct;
    observations.push({
      id: "savings-rate-change",
      tone: improved ? "positive" : "warning",
      text: `Savings rate ${improved ? "improved" : "declined"} from ${previousTotals.savingsRatePct}% to ${totals.savingsRatePct}%.`,
    });
  }

  return observations;
}

// The next-month plan is opt-in: the Review screen asks for it, while the
// Monthly Report (which composes this summary) has no use for it.
export async function getReviewSummary(
  userId: string,
  month: string,
  { withPlan = false }: { withPlan?: boolean } = {}
): Promise<ReviewSummary> {
  const { start, end } = monthBounds(month);
  const prevMonth = previousMonth(month);
  const { start: prevStart, end: prevEnd } = monthBounds(prevMonth);

  const [totalsRaw, prevTotalsRaw, categories, prevCategories, budgetPerformance, subscriptions, savingsGoals, nextMonthPlan] =
    await Promise.all([
      sumTotalsForRange(userId, start, end),
      sumTotalsForRange(userId, prevStart, prevEnd),
      sumExpenseByCategoryForRange(userId, start, end),
      sumExpenseByCategoryForRange(userId, prevStart, prevEnd),
      computeBudgetPerformance(userId, start, end),
      listDetectedSubscriptions(userId),
      findSavingsGoalsByUser(userId),
      withPlan ? getNextMonthPlan(userId, month) : null,
    ]);

  const prevByCategory = new Map(prevCategories.map((c) => [c.categoryId ?? c.categoryName, c.amountKrw]));
  const categoryComparison: CategoryComparison[] = categories.map((c) => {
    const previousKrw = prevByCategory.get(c.categoryId ?? c.categoryName) ?? 0;
    return {
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      currentKrw: c.amountKrw,
      previousKrw,
      deltaKrw: c.amountKrw - previousKrw,
    };
  });

  const subscriptionsMonthlyKrw = subscriptions
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + Math.round(s.estimatedYearlyCostKrw / 12), 0);

  const savingsProgress = computeSavingsProgress(savingsGoals);
  const totals = toMonthTotals(totalsRaw);
  const previousTotals = toMonthTotals(prevTotalsRaw);

  return {
    month,
    totals,
    previousTotals,
    categoryComparison,
    budgetPerformance,
    subscriptionsMonthlyKrw,
    savingsProgress,
    observations: buildReviewObservations(totals, previousTotals, categoryComparison, budgetPerformance),
    nextMonthPlan,
  };
}
