import { sumByBucket } from "@/lib/finance/spending-class";
import type { CategoryAmount, FinanceBucketHealth, FinancialHealthSummary, MoneyRule } from "@/types/finance";

export const DEFAULT_MONEY_RULE: MoneyRule = { essentialPct: 50, lifestylePct: 30, futurePct: 20 };

/**
 * Lifestyle is always the remainder of the other two — see
 * FinancePreferences.essentialTargetPct — so there is exactly one way for
 * the three percentages to disagree about totaling 100, and this function is
 * it. Clamped to 0 so a combined essential+future over 100 (validated
 * against in finance-preferences-service) can never produce a negative
 * Lifestyle target here.
 */
export function toMoneyRule(essentialPct: number, futurePct: number): MoneyRule {
  return { essentialPct, futurePct, lifestylePct: Math.max(100 - essentialPct - futurePct, 0) };
}

// How many percentage points below a maximum guideline (or above a minimum
// one) counts as "Watch" rather than "Healthy". Applied symmetrically so the
// same margin works for Essentials/Lifestyle (maximum) and Future (minimum),
// and scales automatically with whatever money rule preset is active.
const WATCH_MARGIN_PCT = 5;

function maxDirectionStatus(pct: number | null, targetPct: number): FinanceBucketHealth["status"] {
  if (pct === null) return "unavailable";
  if (pct > targetPct) return "over";
  if (pct > targetPct - WATCH_MARGIN_PCT) return "watch";
  return "healthy";
}

function minDirectionStatus(pct: number | null, targetPct: number): FinanceBucketHealth["status"] {
  if (pct === null) return "unavailable";
  if (pct >= targetPct) return "healthy";
  if (pct >= targetPct - WATCH_MARGIN_PCT) return "watch";
  return "below";
}

function pctOfIncome(amountKrw: number, incomeKrw: number): number | null {
  if (incomeKrw <= 0) return null;
  return (amountKrw / incomeKrw) * 100;
}

function overallStatus(
  incomeKrw: number,
  essential: FinanceBucketHealth,
  lifestyle: FinanceBucketHealth,
  future: FinanceBucketHealth
): FinancialHealthSummary["overallStatus"] {
  if (incomeKrw <= 0) return "unavailable";
  const statuses = [essential.status, lifestyle.status, future.status];
  if (statuses.includes("over") || statuses.includes("below")) return "attention";
  if (statuses.includes("watch")) return "watch";
  return "good";
}

// Deterministic, supportive, never guilt-oriented — see AGENTS.md's
// recommendations rule. These are the only sentences an AI explainer may
// quote or paraphrase; it must never derive its own from raw transactions.
function buildRecommendations(
  incomeKrw: number,
  essential: FinanceBucketHealth,
  lifestyle: FinanceBucketHealth,
  future: FinanceBucketHealth
): string[] {
  if (incomeKrw <= 0) return ["Add this month's income to calculate your financial health."];

  const notes: string[] = [];

  if (lifestyle.status === "over") {
    notes.push(`Lifestyle spending is above your ${lifestyle.targetPercentage}% guideline.`);
  } else if (lifestyle.status === "watch") {
    notes.push(
      `Lifestyle is approaching its ${lifestyle.targetPercentage}% guideline. Consider slowing optional spending for the rest of the month.`
    );
  }

  if (future.status === "below" && future.percentageOfIncome !== null) {
    const roundedPct = Math.round(future.percentageOfIncome);
    const gap = Math.max(Math.round(future.targetPercentage - future.percentageOfIncome), 1);
    notes.push(`Your Future rate is ${roundedPct}%. Try moving ${gap} more points toward savings when possible.`);
  }

  if (essential.status === "over") {
    notes.push(`Essentials are above your ${essential.targetPercentage}% guideline this month.`);
  }

  if (notes.length === 0) {
    notes.push(
      essential.status !== "over" && future.status === "healthy"
        ? "Strong month — Essentials are controlled and your Future rate is above target."
        : "Your spending is within your Essentials, Lifestyle, and Future guidelines this month."
    );
  }

  return notes;
}

/**
 * Computes the "is my money healthy this month?" summary from already-loaded
 * totals and per-category expense amounts. Pure and deterministic — no I/O,
 * no AI — so it can be unit tested directly and never diverges between the
 * overview API and any other caller. See getFinanceOverviewSummary for the
 * one place this is called with real data.
 */
export function computeFinancialHealth(
  month: string,
  totalIncomeKrw: number,
  totalExpenseKrw: number,
  expenseCategories: CategoryAmount[],
  moneyRule: MoneyRule,
  // This month's savings-goal contributions, already month-scoped (see
  // sumContributionsForMonth) and converted to KRW by the caller. Defaults to
  // 0 so existing callers/tests that only care about category spending don't
  // need to thread an unrelated value through.
  futureContributionsKrw = 0
): FinancialHealthSummary {
  const totals = sumByBucket(expenseCategories);
  const futureTotalKrw = totals.futureKrw + futureContributionsKrw;

  const essentialPct = pctOfIncome(totals.essentialKrw, totalIncomeKrw);
  const lifestylePct = pctOfIncome(totals.lifestyleKrw, totalIncomeKrw);
  const futurePct = pctOfIncome(futureTotalKrw, totalIncomeKrw);

  const essential: FinanceBucketHealth = {
    bucket: "essential",
    amountKrw: totals.essentialKrw,
    percentageOfIncome: essentialPct,
    targetPercentage: moneyRule.essentialPct,
    direction: "maximum",
    status: maxDirectionStatus(essentialPct, moneyRule.essentialPct),
  };
  const lifestyle: FinanceBucketHealth = {
    bucket: "lifestyle",
    amountKrw: totals.lifestyleKrw,
    percentageOfIncome: lifestylePct,
    targetPercentage: moneyRule.lifestylePct,
    direction: "maximum",
    status: maxDirectionStatus(lifestylePct, moneyRule.lifestylePct),
  };
  const future: FinanceBucketHealth = {
    bucket: "future",
    amountKrw: futureTotalKrw,
    percentageOfIncome: futurePct,
    targetPercentage: moneyRule.futurePct,
    direction: "minimum",
    status: minDirectionStatus(futurePct, moneyRule.futurePct),
  };

  return {
    month,
    essential,
    lifestyle,
    future,
    // growthCategoryKrw and contributionsKrw are two independently-recorded
    // signals (a `growth`-classified expense transaction vs. a manual
    // savings-goal contribution) with no shared key in the schema — summed
    // here on the assumption a user doesn't log the same real-world transfer
    // in both places. Exposed separately so the UI (and the user) can see
    // the split rather than one opaque number.
    futureBreakdown: { growthCategoryKrw: totals.futureKrw, contributionsKrw: futureContributionsKrw },
    unclassifiedKrw: totals.unclassifiedKrw,
    totalIncomeKrw,
    totalExpenseKrw,
    availableKrw: totalIncomeKrw - totalExpenseKrw,
    moneyRule,
    overallStatus: overallStatus(totalIncomeKrw, essential, lifestyle, future),
    recommendations: buildRecommendations(totalIncomeKrw, essential, lifestyle, future),
  };
}
