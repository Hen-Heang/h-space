import "server-only";
import { Errors } from "@/lib/errors";
import {
  createMerchantResolver,
  normalizeMerchant,
  suggestMerchantMerges,
  type MerchantMergeSuggestion,
} from "@/lib/finance/merchant-names";
import {
  deleteMerchantMerge,
  findExpensesSince,
  findMerchantAliases,
  saveMerchantMerge,
} from "@/lib/repositories/finance-merchant-alias-repository";

// Same window subscription detection looks at, so suggestions are about the
// merchants that actually shape the Subscriptions page.
export const MERCHANT_LOOKBACK_MONTHS = 6;

export function lookbackStart(now: Date = new Date()): string {
  const since = new Date(now);
  since.setMonth(since.getMonth() - MERCHANT_LOOKBACK_MONTHS);
  return since.toISOString().slice(0, 10);
}

export interface MerchantMerge {
  name: string;
  variants: { key: string; sample: string }[];
}

export async function getMerchantNames(
  userId: string
): Promise<{ merges: MerchantMerge[]; suggestions: MerchantMergeSuggestion[] }> {
  const [aliases, expenses] = await Promise.all([findMerchantAliases(userId), findExpensesSince(userId, lookbackStart())]);

  const merges = new Map<string, MerchantMerge>();
  for (const alias of aliases) {
    const merge = merges.get(alias.canonicalDescription) ?? { name: alias.canonicalDescription, variants: [] };
    merge.variants.push({ key: alias.normalizedKey, sample: alias.variantDescription });
    merges.set(alias.canonicalDescription, merge);
  }

  return {
    merges: Array.from(merges.values()),
    suggestions: suggestMerchantMerges(expenses, createMerchantResolver(aliases)),
  };
}

/**
 * Merges the given merchant keys under `name`. Keys are the normalized keys
 * the suggestions (or the current groups) returned; each is recorded with the
 * spelling it's most often entered as. A key already in another merge moves
 * to this one. The name's own key is always included, so typing a new name
 * doesn't leave it pointing nowhere.
 */
export async function mergeMerchants(userId: string, name: string, keys: string[]): Promise<{ merged: number }> {
  const canonicalKey = normalizeMerchant(name);
  if (!canonicalKey) throw Errors.validation("Enter a name with at least one letter or number.");

  const wanted = new Set(keys.map((key) => normalizeMerchant(key)).filter(Boolean));
  wanted.add(canonicalKey);
  if (wanted.size < 2) throw Errors.validation("Pick at least two different merchant names to merge.");

  const expenses = await findExpensesSince(userId, lookbackStart());
  const spellings = new Map<string, Map<string, number>>();
  for (const expense of expenses) {
    const key = normalizeMerchant(expense.description);
    if (!wanted.has(key)) continue;
    const counts = spellings.get(key) ?? new Map<string, number>();
    const raw = expense.description.trim();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
    spellings.set(key, counts);
  }

  const members = Array.from(wanted).map((key) => {
    const counts = spellings.get(key);
    const sample = counts ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : key === canonicalKey ? name : key;
    return { normalizedKey: key, sample };
  });

  await saveMerchantMerge(userId, name, members);
  return { merged: members.length };
}

export async function unmergeMerchants(userId: string, name: string): Promise<void> {
  const removed = await deleteMerchantMerge(userId, name);
  if (removed === 0) throw Errors.notFound("Merchant merge");
}
