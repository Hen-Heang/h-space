import { describe, expect, it } from "vitest";
import { computeFinancialHealth, toMoneyRule } from "@/lib/finance/financial-health";
import type { CategoryAmount } from "@/types/finance";

function category(name: string, spendingClass: CategoryAmount["spendingClass"], amountKrw: number): CategoryAmount {
  return { categoryId: name, categoryName: name, categoryIcon: null, categoryColor: null, spendingClass, amountKrw };
}

const BALANCED_RULE = toMoneyRule(50, 20); // { essentialPct: 50, lifestylePct: 30, futurePct: 20 }

describe("toMoneyRule", () => {
  it("derives Lifestyle as the remainder", () => {
    expect(toMoneyRule(50, 20)).toEqual({ essentialPct: 50, lifestylePct: 30, futurePct: 20 });
    expect(toMoneyRule(45, 35)).toEqual({ essentialPct: 45, lifestylePct: 20, futurePct: 35 });
  });

  it("clamps a negative remainder to zero instead of going negative", () => {
    expect(toMoneyRule(70, 50).lifestylePct).toBe(0);
  });
});

describe("computeFinancialHealth", () => {
  it("50/30/20 example: 40% essential, 25% lifestyle, 25% future are all within guideline", () => {
    const health = computeFinancialHealth(
      "2026-09",
      1_000_000,
      900_000,
      [
        category("Housing", "essential", 400_000),
        category("Travel", "flexible", 250_000),
        category("Investment", "growth", 250_000),
      ],
      BALANCED_RULE
    );

    expect(health.essential.percentageOfIncome).toBe(40);
    expect(health.essential.status).toBe("healthy");
    expect(health.lifestyle.percentageOfIncome).toBe(25);
    expect(health.lifestyle.status).toBe("healthy");
    expect(health.future.percentageOfIncome).toBe(25);
    expect(health.future.status).toBe("healthy");
    expect(health.overallStatus).toBe("good");
  });

  it("flags Lifestyle over its 30% guideline at 35%", () => {
    const health = computeFinancialHealth(
      "2026-09",
      1_000_000,
      350_000,
      [category("Shopping", "flexible", 350_000)],
      BALANCED_RULE
    );

    expect(health.lifestyle.percentageOfIncome).toBe(35);
    expect(health.lifestyle.status).toBe("over");
    expect(health.overallStatus).toBe("attention");
  });

  it("flags Future below its 20% minimum at 10%", () => {
    const health = computeFinancialHealth(
      "2026-09",
      1_000_000,
      100_000,
      [category("Investment", "growth", 100_000)],
      BALANCED_RULE
    );

    expect(health.future.percentageOfIncome).toBe(10);
    expect(health.future.status).toBe("below");
    expect(health.overallStatus).toBe("attention");
  });

  it("never divides by zero when income is zero — percentages are unavailable, not NaN/Infinity", () => {
    const health = computeFinancialHealth("2026-09", 0, 100_000, [category("Housing", "essential", 100_000)], BALANCED_RULE);

    expect(health.essential.percentageOfIncome).toBeNull();
    expect(health.essential.status).toBe("unavailable");
    expect(health.lifestyle.status).toBe("unavailable");
    expect(health.future.status).toBe("unavailable");
    expect(health.overallStatus).toBe("unavailable");
    expect(Number.isNaN(health.availableKrw)).toBe(false);
    expect(health.recommendations).toEqual(["Add this month's income to calculate your financial health."]);
  });

  it("boundary: exactly 50% Essentials is not 'over'", () => {
    const health = computeFinancialHealth("2026-09", 1_000_000, 500_000, [category("Housing", "essential", 500_000)], BALANCED_RULE);
    expect(health.essential.status).not.toBe("over");
  });

  it("boundary: exactly 30% Lifestyle is not 'over'", () => {
    const health = computeFinancialHealth("2026-09", 1_000_000, 300_000, [category("Shopping", "flexible", 300_000)], BALANCED_RULE);
    expect(health.lifestyle.status).not.toBe("over");
  });

  it("boundary: exactly 20% Future meets the minimum target", () => {
    const health = computeFinancialHealth("2026-09", 1_000_000, 200_000, [category("Investment", "growth", 200_000)], BALANCED_RULE);
    expect(health.future.status).toBe("healthy");
  });

  it("counts spending with no spending_class as unclassified, excluded from every bucket", () => {
    const health = computeFinancialHealth(
      "2026-09",
      1_000_000,
      500_000,
      [category("Housing", "essential", 300_000), category("Mystery", null, 200_000)],
      BALANCED_RULE
    );

    expect(health.essential.amountKrw).toBe(300_000);
    expect(health.unclassifiedKrw).toBe(200_000);
    expect(health.lifestyle.amountKrw).toBe(0);
    expect(health.future.amountKrw).toBe(0);
  });

  it("adds this month's savings contributions into Future, on top of growth-category spending", () => {
    const health = computeFinancialHealth(
      "2026-09",
      1_000_000,
      300_000,
      [category("Investment", "growth", 100_000)],
      BALANCED_RULE,
      150_000 // futureContributionsKrw
    );

    expect(health.futureBreakdown).toEqual({ growthCategoryKrw: 100_000, contributionsKrw: 150_000 });
    expect(health.future.amountKrw).toBe(250_000);
    expect(health.future.percentageOfIncome).toBe(25);
  });

  it("defaults futureContributionsKrw to 0 when the caller doesn't pass one", () => {
    const health = computeFinancialHealth("2026-09", 1_000_000, 100_000, [category("Investment", "growth", 100_000)], BALANCED_RULE);
    expect(health.futureBreakdown).toEqual({ growthCategoryKrw: 100_000, contributionsKrw: 0 });
  });

  it("still reports a real Future amount from contributions even with zero income", () => {
    const health = computeFinancialHealth("2026-09", 0, 0, [], BALANCED_RULE, 273_000);

    expect(health.future.amountKrw).toBe(273_000);
    expect(health.future.percentageOfIncome).toBeNull();
    expect(health.future.status).toBe("unavailable");
  });
});
