import type { CategoryAmount, FinanceBucket, SpendingClass } from "@/types/finance";

// Categories whose name signals a fixed, essential obligation. Any other
// `commitment` category (the common case: subscriptions) defaults to
// Lifestyle — see bucketForCategory below and AGENTS.md's Financial Health
// spec, section 5 ("commitment is contextual").
const ESSENTIAL_COMMITMENT_KEYWORDS = [
  "rent",
  "mortgage",
  "insurance",
  "loan",
  "utility",
  "utilities",
  "tuition",
  "installment",
];

export function isEssentialCommitment(categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return ESSENTIAL_COMMITMENT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Maps a category's spending_class (plus its name, needed only for the
 * contextual `commitment` class) to one of the three Financial Health
 * buckets. A category with no spending_class yet returns null — its
 * spending still counts toward totals, but is excluded from the bucket
 * breakdown until the user classifies it (see suggestDefaultSpendingClass
 * for the deterministic starting suggestion shown in the category editor).
 */
export function bucketForCategory(spendingClass: SpendingClass | null, categoryName: string): FinanceBucket | null {
  switch (spendingClass) {
    case "essential":
      return "essential";
    case "growth":
      return "future";
    case "flexible":
    case "avoidable":
      return "lifestyle";
    case "commitment":
      return isEssentialCommitment(categoryName) ? "essential" : "lifestyle";
    default:
      return null;
  }
}

export interface BucketTotals {
  essentialKrw: number;
  lifestyleKrw: number;
  futureKrw: number;
  unclassifiedKrw: number;
}

/** Sums a month's expense-by-category rows into the three Financial Health buckets. */
export function sumByBucket(categories: CategoryAmount[]): BucketTotals {
  const totals: BucketTotals = { essentialKrw: 0, lifestyleKrw: 0, futureKrw: 0, unclassifiedKrw: 0 };

  for (const category of categories) {
    const bucket = bucketForCategory(category.spendingClass, category.categoryName);
    if (bucket === "essential") totals.essentialKrw += category.amountKrw;
    else if (bucket === "lifestyle") totals.lifestyleKrw += category.amountKrw;
    else if (bucket === "future") totals.futureKrw += category.amountKrw;
    else totals.unclassifiedKrw += category.amountKrw;
  }

  return totals;
}

// Deterministic starting classification for a category the user hasn't
// classified yet, matched by name — so a fresh account (or one migrated from
// Money Flow) doesn't sit entirely Unclassified. This only ever seeds what
// the category editor pre-selects; it never overwrites a class already set,
// and the user can change it at any time.
const DEFAULT_CLASS_BY_NAME: Record<string, SpendingClass> = {
  housing: "essential",
  rent: "essential",
  food: "essential",
  groceries: "essential",
  healthcare: "essential",
  health: "essential",
  medical: "essential",
  transportation: "essential",
  transport: "essential",
  utilities: "essential",
  education: "growth",
  investment: "growth",
  investing: "growth",
  savings: "growth",
  beauty: "flexible",
  drink: "flexible",
  drinks: "flexible",
  entertainment: "flexible",
  family: "flexible",
  fitness: "flexible",
  gift: "flexible",
  gifts: "flexible",
  shopping: "flexible",
  social: "flexible",
  travel: "flexible",
  "food delivery": "avoidable",
  delivery: "avoidable",
  "tech & gadgets": "avoidable",
  gadgets: "avoidable",
  tech: "avoidable",
  subscription: "commitment",
  subscriptions: "commitment",
};

export function suggestDefaultSpendingClass(categoryName: string): SpendingClass | null {
  return DEFAULT_CLASS_BY_NAME[categoryName.trim().toLowerCase()] ?? null;
}

export const SPENDING_CLASS_META: Record<SpendingClass, { label: string; description: string }> = {
  essential: { label: "Essential", description: "Needed for normal daily life." },
  growth: { label: "Growth", description: "Improves your future, skills, savings, or wealth." },
  flexible: { label: "Flexible", description: "Optional spending you value." },
  avoidable: { label: "Avoidable", description: "Easy to reduce when you want to save more." },
  commitment: { label: "Commitment", description: "A recurring or fixed obligation." },
};

export const SPENDING_CLASS_ORDER: SpendingClass[] = ["essential", "growth", "flexible", "avoidable", "commitment"];
