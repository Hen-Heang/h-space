import { describe, expect, it } from "vitest";
import { buildBudgetPlan, budgetRoundingStep, median, monthsEndingAt, roundToStep, shiftMonth } from "@/lib/finance/budget-plan";
import type { Budget, CategoryAmount } from "@/types/finance";

function spend(name: string, spendingClass: CategoryAmount["spendingClass"], amountKrw: number): CategoryAmount {
  return { categoryId: name, categoryName: name, categoryIcon: null, categoryColor: null, spendingClass, amountKrw };
}

function budget(name: string, amountKrw: number): Budget {
  return { categoryId: name, categoryName: name, categoryIcon: null, categoryColor: null, amountKrw };
}

const MONTHS = ["2026-07", "2026-08", "2026-09"];

function plan(spendByMonth: CategoryAmount[][], budgets: Budget[] = [], incomeByMonth = [3_000_000, 3_000_000, 3_000_000]) {
  return buildBudgetPlan({ planMonth: "2026-10", months: MONTHS, spendByMonth, incomeByMonth, budgets, targetSavingsRatePct: 20 });
}

describe("month helpers", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("lists the months ending at, and including, the given month", () => {
    expect(monthsEndingAt("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("stats helpers", () => {
  it("takes the median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("rounds to a friendly step by magnitude", () => {
    expect(budgetRoundingStep(420_000)).toBe(10_000);
    expect(budgetRoundingStep(42_000)).toBe(1_000);
    expect(budgetRoundingStep(4_200)).toBe(500);
    expect(roundToStep(378_412, 10_000)).toBe(380_000);
  });
});

describe("buildBudgetPlan", () => {
  it("trims a flexible category by one 10% step from its median", () => {
    const result = plan([[spend("Travel", "flexible", 400_000)], [spend("Travel", "flexible", 420_000)], [spend("Travel", "flexible", 900_000)]]);
    const travel = result.recommendations[0];
    // Median 420,000 ignores the 900,000 outlier; 10% off → 378,000 → 380,000.
    expect(travel.medianKrw).toBe(420_000);
    expect(travel.recommendedBudgetKrw).toBe(380_000);
    expect(travel.reason).toBe("gradual_reduction");
  });

  it("trims an avoidable category by 20%", () => {
    const month = [spend("Delivery", "avoidable", 100_000)];
    expect(plan([month, month, month]).recommendations[0]).toMatchObject({
      recommendedBudgetKrw: 80_000,
      reason: "gradual_reduction",
    });
  });

  it("never trims an unclassified or essential category", () => {
    const month = [spend("Family", null, 300_000), spend("Rent", "essential", 800_000)];
    const result = plan([month, month, month], [budget("Rent", 800_000)]);
    const byName = Object.fromEntries(result.recommendations.map((r) => [r.categoryName, r]));
    expect(byName.Family).toMatchObject({ recommendedBudgetKrw: 300_000, reason: "first_budget" });
    expect(byName.Rent).toMatchObject({ recommendedBudgetKrw: 800_000, reason: "hold_steady" });
  });

  it("raises a budget set unrealistically below typical spending, even for a flexible category", () => {
    const month = [spend("Shopping", "flexible", 500_000)];
    expect(plan([month, month, month], [budget("Shopping", 200_000)]).recommendations[0]).toMatchObject({
      currentBudgetKrw: 200_000,
      recommendedBudgetKrw: 500_000,
      reason: "raise_unrealistic",
    });
  });

  it("counts a month with no spending as zero rather than skipping it", () => {
    const result = plan([[spend("Gifts", null, 300_000)], [], [spend("Gifts", null, 90_000)]]);
    // Months 300,000 / 0 / 90,000 → median 90,000 (not 195,000 from the two active months).
    expect(result.recommendations[0]).toMatchObject({ averageKrw: 130_000, medianKrw: 90_000, recommendedBudgetKrw: 90_000 });
  });

  it("leaves out sporadic categories whose typical month is ₩0", () => {
    const result = plan([[spend("Gifts", null, 300_000)], [], []]);
    expect(result.recommendations).toEqual([]);
  });

  it("drops uncategorized spending and categories with no spend", () => {
    const uncategorized: CategoryAmount = { ...spend("Uncategorized", null, 50_000), categoryId: null };
    const result = plan([[uncategorized], [uncategorized], [uncategorized]], [budget("Unused", 100_000)]);
    expect(result.recommendations).toEqual([]);
  });

  it("projects the savings rate and the extra trim needed to hit the target", () => {
    const month = [spend("Rent", "essential", 1_500_000), spend("Food", "essential", 1_000_000)];
    const result = plan([month, month, month]);
    // Income 3,000,000, plan 2,500,000 → 17% vs. 20% target; target spend 2,400,000.
    expect(result.totalRecommendedKrw).toBe(2_500_000);
    expect(result.projectedSavingsRatePct).toBe(17);
    expect(result.additionalTrimNeededKrw).toBe(100_000);
  });

  it("returns a null savings rate when there was no income", () => {
    const month = [spend("Food", "essential", 100_000)];
    const result = plan([month, month, month], [], [0, 0, 0]);
    expect(result.projectedSavingsRatePct).toBeNull();
    expect(result.additionalTrimNeededKrw).toBe(0);
  });

  it("orders recommendations by typical spend, largest first", () => {
    const month = [spend("Small", null, 10_000), spend("Large", null, 900_000)];
    expect(plan([month, month, month]).recommendations.map((r) => r.categoryName)).toEqual(["Large", "Small"]);
  });
});
