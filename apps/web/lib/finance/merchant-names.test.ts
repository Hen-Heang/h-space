import { describe, expect, it } from "vitest";
import {
  createMerchantResolver,
  groupRecurringExpenses,
  keySimilarity,
  looksLikeSameMerchant,
  normalizeMerchant,
  suggestMerchantMerges,
  type MerchantExpense,
} from "@/lib/finance/merchant-names";

const none = createMerchantResolver([]);

function expense(description: string, date: string, amountKrw = 10_000, categoryId: string | null = null): MerchantExpense {
  return { description, date, amountKrw, categoryId };
}

describe("normalizeMerchant", () => {
  it("folds case, punctuation, whitespace, and domain noise into one key", () => {
    for (const raw of ["NETFLIX", "Netflix.com", " netflix ", "www.netflix.com", "Netflix, Inc."]) {
      expect(normalizeMerchant(raw)).toBe("netflix");
    }
  });

  it("keeps words that distinguish real merchants", () => {
    expect(normalizeMerchant("Kakao Pay")).toBe("kakao pay");
    expect(normalizeMerchant("Coupang Eats")).not.toBe(normalizeMerchant("Coupang"));
  });

  it("handles full-width and Korean text", () => {
    expect(normalizeMerchant("ＧＳ２５")).toBe("gs25");
    expect(normalizeMerchant("스타벅스 강남점")).toBe("스타벅스 강남점");
  });

  it("returns an empty key for punctuation-only input", () => {
    expect(normalizeMerchant("...")).toBe("");
  });
});

describe("looksLikeSameMerchant", () => {
  it("matches a name contained in a longer one", () => {
    expect(looksLikeSameMerchant("claude", "claude ai pro")).toBe(true);
    expect(looksLikeSameMerchant("gs25 gangnam", "gs25")).toBe(true);
  });

  it("matches names sharing at least half their words", () => {
    expect(keySimilarity("starbucks reserve", "starbucks")).toBe(0.5);
    expect(looksLikeSameMerchant("apple music family", "apple music")).toBe(true);
  });

  it("doesn't pair names that only share a generic word", () => {
    expect(looksLikeSameMerchant("coffee bean", "coffee shop")).toBe(false);
  });

  it("doesn't let a short shared word pair unrelated names", () => {
    expect(looksLikeSameMerchant("a", "a cafe")).toBe(false);
  });

  it("ignores a shared word the caller marks generic", () => {
    expect(looksLikeSameMerchant("lunch", "lunch at office", (word) => word === "lunch")).toBe(false);
  });
});

describe("groupRecurringExpenses", () => {
  it("groups cosmetic variants automatically and keeps the newest spelling", () => {
    const groups = groupRecurringExpenses(
      [expense("Netflix.com", "2026-10-03"), expense("NETFLIX", "2026-09-03"), expense("netflix", "2026-08-03")],
      none
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "netflix", displayName: "Netflix.com", occurrenceCount: 3 });
    expect(groups[0].dates).toEqual(["2026-10-03", "2026-09-03", "2026-08-03"]);
  });

  it("leaves real variants apart until the user merges them", () => {
    const expenses = [
      expense("Claude", "2026-10-01"),
      expense("Claude AI Pro", "2026-09-01"),
      expense("Claude", "2026-08-01"),
      expense("Claude AI Pro", "2026-07-01"),
    ];
    expect(groupRecurringExpenses(expenses, none).map((g) => g.key).sort()).toEqual(["claude", "claude ai pro"]);

    const merged = createMerchantResolver([
      { normalizedKey: "claude", canonicalDescription: "Claude" },
      { normalizedKey: "claude ai pro", canonicalDescription: "Claude" },
    ]);
    const groups = groupRecurringExpenses(expenses, merged);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "claude", displayName: "Claude", occurrenceCount: 4 });
  });

  it("drops one-off payments and takes the category from the newest payment", () => {
    const groups = groupRecurringExpenses(
      [expense("Gym", "2026-10-01", 50_000, "new"), expense("Gym", "2026-09-01", 50_000, "old"), expense("Gift", "2026-09-10")],
      none
    );
    expect(groups.map((g) => g.key)).toEqual(["gym"]);
    expect(groups[0].categoryId).toBe("new");
  });
});

describe("suggestMerchantMerges", () => {
  it("suggests real variants with combined counts, named after the most used one", () => {
    const suggestions = suggestMerchantMerges(
      [
        { description: "Claude", amountKrw: 30_000 },
        { description: "Claude", amountKrw: 30_000 },
        { description: "Claude AI Pro", amountKrw: 30_000 },
        { description: "Coffee Bean", amountKrw: 5_000 },
        { description: "Coffee Shop", amountKrw: 5_000 },
      ],
      none
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ suggestedName: "Claude", occurrenceCount: 3, totalKrw: 90_000, id: "claude|claude ai pro" });
  });

  it("treats a word in many distinct descriptions as generic, not a merchant", () => {
    const phrases = ["Lunch", "Lunch at office", "Lunch with team", "Lunch box", "Lunch delivery"];
    const suggestions = suggestMerchantMerges(
      phrases.flatMap((description) => Array(2).fill({ description, amountKrw: 9_000 })),
      none
    );
    expect(suggestions).toEqual([]);
  });

  it("skips pairs seen fewer than three times in total", () => {
    expect(suggestMerchantMerges([{ description: "Claude", amountKrw: 1 }, { description: "Claude AI Pro", amountKrw: 1 }], none)).toEqual([]);
  });

  it("doesn't chain a~b~c into one suggestion: each joins only the seed it resembles", () => {
    const suggestions = suggestMerchantMerges(
      [
        ...Array(3).fill({ description: "alpha beta", amountKrw: 1 }),
        ...Array(2).fill({ description: "beta gamma", amountKrw: 1 }),
        ...Array(2).fill({ description: "gamma delta", amountKrw: 1 }),
      ],
      none
    );
    // "beta gamma" is half like the seed "alpha beta"; "gamma delta" shares nothing with it.
    expect(suggestions.flatMap((s) => s.members.map((m) => m.key))).not.toContain("gamma delta");
  });

  it("stops suggesting once the variants are merged", () => {
    const expenses = [
      { description: "Claude", amountKrw: 1 },
      { description: "Claude", amountKrw: 1 },
      { description: "Claude AI Pro", amountKrw: 1 },
    ];
    const merged = createMerchantResolver([{ normalizedKey: "claude ai pro", canonicalDescription: "Claude" }]);
    expect(suggestMerchantMerges(expenses, merged)).toEqual([]);
  });

  it("offers a new variant joining an existing merge under the merge's name", () => {
    const merged = createMerchantResolver([{ normalizedKey: "claude ai pro", canonicalDescription: "Claude" }]);
    const suggestions = suggestMerchantMerges(
      [
        { description: "Claude", amountKrw: 1 },
        { description: "Claude AI Pro", amountKrw: 1 },
        { description: "Claude Max", amountKrw: 1 },
      ],
      merged
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedName).toBe("Claude");
    expect(suggestions[0].members.map((m) => m.key).sort()).toEqual(["claude", "claude max"]);
  });
});
