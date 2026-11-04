import { describe, expect, it } from "vitest";
import { bucketForCategory, isEssentialCommitment, sumByBucket, suggestDefaultSpendingClass } from "@/lib/finance/spending-class";
import type { CategoryAmount } from "@/types/finance";

function category(overrides: Partial<CategoryAmount>): CategoryAmount {
  return {
    categoryId: "cat-1",
    categoryName: "Test",
    categoryIcon: null,
    categoryColor: null,
    spendingClass: null,
    amountKrw: 0,
    ...overrides,
  };
}

describe("bucketForCategory", () => {
  it("maps essential straight through", () => {
    expect(bucketForCategory("essential", "Housing")).toBe("essential");
  });

  it("maps growth to future", () => {
    expect(bucketForCategory("growth", "Investment")).toBe("future");
  });

  it("maps flexible and avoidable to lifestyle", () => {
    expect(bucketForCategory("flexible", "Travel")).toBe("lifestyle");
    expect(bucketForCategory("avoidable", "Food Delivery")).toBe("lifestyle");
  });

  it("resolves commitment by category name — essential-sounding names win Essentials", () => {
    expect(bucketForCategory("commitment", "Rent")).toBe("essential");
    expect(bucketForCategory("commitment", "Home Insurance")).toBe("essential");
    expect(bucketForCategory("commitment", "Car Loan")).toBe("essential");
  });

  it("resolves commitment to Lifestyle by default (subscriptions etc.)", () => {
    expect(bucketForCategory("commitment", "Subscription")).toBe("lifestyle");
    expect(bucketForCategory("commitment", "Gym Membership")).toBe("lifestyle");
  });

  it("returns null for an unclassified category", () => {
    expect(bucketForCategory(null, "Mystery")).toBeNull();
  });
});

describe("isEssentialCommitment", () => {
  it("is case-insensitive", () => {
    expect(isEssentialCommitment("RENT")).toBe(true);
    expect(isEssentialCommitment("Netflix Subscription")).toBe(false);
  });
});

describe("sumByBucket", () => {
  it("sums categories into essential/lifestyle/future/unclassified", () => {
    const totals = sumByBucket([
      category({ categoryName: "Housing", spendingClass: "essential", amountKrw: 400_000 }),
      category({ categoryName: "Investment", spendingClass: "growth", amountKrw: 250_000 }),
      category({ categoryName: "Travel", spendingClass: "flexible", amountKrw: 150_000 }),
      category({ categoryName: "Rent", spendingClass: "commitment", amountKrw: 300_000 }),
      category({ categoryName: "Subscription", spendingClass: "commitment", amountKrw: 20_000 }),
      category({ categoryName: "Mystery", spendingClass: null, amountKrw: 10_000 }),
    ]);

    expect(totals).toEqual({
      essentialKrw: 700_000,
      lifestyleKrw: 170_000,
      futureKrw: 250_000,
      unclassifiedKrw: 10_000,
    });
  });

  it("returns all zeros for an empty list", () => {
    expect(sumByBucket([])).toEqual({ essentialKrw: 0, lifestyleKrw: 0, futureKrw: 0, unclassifiedKrw: 0 });
  });
});

describe("suggestDefaultSpendingClass", () => {
  it("suggests a class for a known category name, case- and whitespace-insensitive", () => {
    expect(suggestDefaultSpendingClass(" Housing ")).toBe("essential");
    expect(suggestDefaultSpendingClass("SHOPPING")).toBe("flexible");
    expect(suggestDefaultSpendingClass("Food Delivery")).toBe("avoidable");
  });

  it("returns null for an unknown category name", () => {
    expect(suggestDefaultSpendingClass("Something Unusual")).toBeNull();
  });
});
