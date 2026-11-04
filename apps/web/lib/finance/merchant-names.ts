// Merchant name normalization, merge suggestions, and alias-aware grouping
// for subscription detection. Pure — no database access — so the rules that
// decide "is this the same merchant?" are unit-tested in isolation.
//
// Two strictness levels, deliberately:
//  - Cosmetic variants ("NETFLIX", "Netflix.com", "netflix ") normalize to the
//    same key and are grouped automatically. Only case, punctuation, and a
//    short list of domain/company noise words differ, so this can't merge two
//    genuinely different merchants.
//  - Real variants ("Claude" vs "Claude AI Pro") are only *suggested*. Nothing
//    merges until the user confirms, which stores an alias row. Transaction
//    descriptions themselves are never rewritten.

// Tokens that carry no merchant identity: web/domain parts and company
// suffixes. Kept short on purpose — "pay", "store", "eats" etc. distinguish
// real merchants (Kakao vs Kakao Pay) and must stay.
const NOISE_TOKENS = new Set(["www", "com", "net", "org", "co", "kr", "io", "inc", "ltd", "llc", "corp"]);

/** Grouping key: casefolded, punctuation → spaces, noise tokens dropped. */
export function normalizeMerchant(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((token) => token && !NOISE_TOKENS.has(token))
    .join(" ");
}

/** Jaccard similarity of two normalized keys' word sets (0–1). */
export function keySimilarity(a: string, b: string): number {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / (left.size + right.size - shared);
}

/** A confirmed merge: every variant key resolves to `canonical`. */
export interface MerchantAlias {
  normalizedKey: string;
  canonicalDescription: string;
}

export interface MerchantResolver {
  /** The group key a description belongs to, after applying confirmed merges. */
  keyOf: (description: string) => string;
  /** The confirmed display name for a resolved key, if it came from a merge. */
  canonicalNameOf: (key: string) => string | undefined;
}

export function createMerchantResolver(aliases: MerchantAlias[]): MerchantResolver {
  const canonicalByVariant = new Map(aliases.map((alias) => [alias.normalizedKey, alias.canonicalDescription]));
  const nameByKey = new Map(aliases.map((alias) => [normalizeMerchant(alias.canonicalDescription), alias.canonicalDescription]));
  return {
    keyOf: (description) => {
      const key = normalizeMerchant(description);
      const canonical = canonicalByVariant.get(key);
      return canonical !== undefined ? normalizeMerchant(canonical) : key;
    },
    canonicalNameOf: (key) => nameByKey.get(key),
  };
}

export interface MerchantExpense {
  description: string;
  categoryId: string | null;
  /** YYYY-MM-DD */
  date: string;
  amountKrw: number;
}

export interface RecurringExpenseGroup {
  key: string;
  displayName: string;
  categoryId: string | null;
  /** Newest first, parallel to `amounts`. */
  dates: string[];
  amounts: number[];
  occurrenceCount: number;
}

/**
 * Groups expenses into merchants that recur (two or more payments). Expects
 * `expenses` newest first. The display name is the confirmed merge name when
 * there is one, otherwise the most recent spelling.
 */
export function groupRecurringExpenses(expenses: MerchantExpense[], resolver: MerchantResolver): RecurringExpenseGroup[] {
  const groups = new Map<string, RecurringExpenseGroup>();

  for (const expense of expenses) {
    const raw = expense.description.trim();
    if (!raw) continue;
    const key = resolver.keyOf(raw);
    if (!key) continue;

    const group = groups.get(key) ?? {
      key,
      displayName: resolver.canonicalNameOf(key) ?? raw,
      categoryId: expense.categoryId,
      dates: [],
      amounts: [],
      occurrenceCount: 0,
    };
    group.dates.push(expense.date);
    group.amounts.push(expense.amountKrw);
    group.occurrenceCount += 1;
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .filter((group) => group.occurrenceCount >= 2)
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}

const SUGGEST_SIMILARITY = 0.5;

// A word used in more than this many distinct descriptions is a generic word
// ("lunch", "coffee", "taxi") rather than a merchant's name. Descriptions are
// free text, so without this "lunch" would pull in every "lunch at …" phrase.
const MAX_KEYS_FOR_DISTINCTIVE_WORD = 3;

/**
 * Whether two keys look like one merchant. They must share a distinctive word
 * — 3+ characters and not generic (see `isGeneric`) — so a stray "a" or a
 * common word like "lunch" can never pair different things. Then they must
 * either share at least half their words, or every word of one must appear in
 * the other ("claude" ⊂ "claude ai pro", "gs25" ⊂ "gs25 gangnam").
 */
export function looksLikeSameMerchant(a: string, b: string, isGeneric: (token: string) => boolean = () => false): boolean {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  const shared = [...left].filter((token) => right.has(token));
  if (!shared.some((token) => token.length >= 3 && !isGeneric(token))) return false;
  if (keySimilarity(a, b) >= SUGGEST_SIMILARITY) return true;
  return shared.length === Math.min(left.size, right.size);
}
// A pairing seen only once or twice isn't worth asking about.
const MIN_SUGGEST_OCCURRENCES = 3;

export interface MerchantNameMember {
  key: string;
  /** The spelling used most often under this key. */
  sample: string;
  count: number;
  totalKrw: number;
}

export interface MerchantMergeSuggestion {
  /** Stable for the same set of keys, so a dismissed suggestion stays dismissed. */
  id: string;
  suggestedName: string;
  members: MerchantNameMember[];
  occurrenceCount: number;
  totalKrw: number;
}

/**
 * Suggests merges between merchants whose names overlap. Each cluster is
 * seeded by its most frequent merchant and only admits keys similar to that
 * seed — so "a~b, b~c" can't chain unrelated names into one suggestion.
 * Keys already merged count as their canonical group.
 */
export function suggestMerchantMerges(
  expenses: Pick<MerchantExpense, "description" | "amountKrw">[],
  resolver: MerchantResolver
): MerchantMergeSuggestion[] {
  const byKey = new Map<string, { spellings: Map<string, number>; count: number; totalKrw: number }>();
  for (const expense of expenses) {
    const raw = expense.description.trim();
    const key = raw ? resolver.keyOf(raw) : "";
    if (!key) continue;
    const entry = byKey.get(key) ?? { spellings: new Map(), count: 0, totalKrw: 0 };
    entry.spellings.set(raw, (entry.spellings.get(raw) ?? 0) + 1);
    entry.count += 1;
    entry.totalKrw += expense.amountKrw;
    byKey.set(key, entry);
  }

  const members: MerchantNameMember[] = Array.from(byKey.entries())
    .map(([key, entry]) => ({
      key,
      sample: resolver.canonicalNameOf(key) ?? mostUsed(entry.spellings),
      count: entry.count,
      totalKrw: entry.totalKrw,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const keysPerWord = new Map<string, number>();
  for (const { key } of members) {
    for (const word of new Set(key.split(" "))) keysPerWord.set(word, (keysPerWord.get(word) ?? 0) + 1);
  }
  const isGeneric = (word: string) => (keysPerWord.get(word) ?? 0) > MAX_KEYS_FOR_DISTINCTIVE_WORD;

  const clusters: MerchantNameMember[][] = [];
  for (const member of members) {
    const cluster = clusters.find((candidate) => looksLikeSameMerchant(candidate[0].key, member.key, isGeneric));
    if (cluster) cluster.push(member);
    else clusters.push([member]);
  }

  return clusters
    .filter((cluster) => cluster.length >= 2)
    .map((cluster) => ({
      id: cluster.map((member) => member.key).sort().join("|"),
      suggestedName: cluster[0].sample,
      members: cluster,
      occurrenceCount: cluster.reduce((sum, member) => sum + member.count, 0),
      totalKrw: cluster.reduce((sum, member) => sum + member.totalKrw, 0),
    }))
    .filter((suggestion) => suggestion.occurrenceCount >= MIN_SUGGEST_OCCURRENCES)
    .sort((a, b) => b.totalKrw - a.totalKrw);
}

// Most frequent spelling; ties go to the longer (usually fuller) one.
function mostUsed(spellings: Map<string, number>): string {
  let best = "";
  let bestCount = -1;
  for (const [spelling, count] of spellings) {
    if (count > bestCount || (count === bestCount && spelling.length > best.length)) {
      best = spelling;
      bestCount = count;
    }
  }
  return best;
}
