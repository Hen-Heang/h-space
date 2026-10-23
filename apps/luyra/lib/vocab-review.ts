import type { MasteryFilter, VocabCard, VocabSortOrder, VocabStats } from "@/types/learning";

// Ported from Hengo's lib/vocab-review.ts, trimmed to what Luyra's
// simplified review flow (flashcard mode only, no typed-recall mode) needs —
// isCorrectTerm is dropped since there's no typed-answer mode here.

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function matchesMastery(mastery: number, filter: MasteryFilter): boolean {
  switch (filter) {
    case "weak":
      return mastery < 50;
    case "learning":
      return mastery >= 50 && mastery < 80;
    case "mastered":
      return mastery >= 80;
    default:
      return true;
  }
}

export function filterVocab(words: VocabCard[], query: string, filter: MasteryFilter): VocabCard[] {
  const q = query.trim().toLowerCase();
  return words.filter((word) => {
    if (!matchesMastery(word.mastery, filter)) return false;
    if (!q) return true;
    return [word.term, word.meaning, word.pronunciation ?? "", word.category, ...word.tags].some((field) =>
      field.toLowerCase().includes(q)
    );
  });
}

/** Returns a new array sorted by the chosen order. Ties fall back to the term. */
export function sortVocab(words: VocabCard[], order: VocabSortOrder): VocabCard[] {
  const byTerm = (a: VocabCard, b: VocabCard) => a.term.localeCompare(b.term, "ko");
  return [...words].sort((a, b) => {
    switch (order) {
      case "mastery-asc":
        return a.mastery - b.mastery || byTerm(a, b);
      case "mastery-desc":
        return b.mastery - a.mastery || byTerm(a, b);
      case "due":
        return a.nextReview.localeCompare(b.nextReview) || byTerm(a, b);
      default:
        return byTerm(a, b);
    }
  });
}

/** Aggregates a deck into the mastery buckets used across the dictionary. */
export function computeVocabStats(words: VocabCard[]): VocabStats {
  const stats = words.reduce(
    (acc, word) => {
      acc.sum += word.mastery;
      if (word.mastery >= 80) acc.mastered += 1;
      else if (word.mastery >= 50) acc.learning += 1;
      else acc.weak += 1;
      return acc;
    },
    { sum: 0, weak: 0, learning: 0, mastered: 0 }
  );

  return {
    total: words.length,
    weak: stats.weak,
    learning: stats.learning,
    mastered: stats.mastered,
    averageMastery: words.length ? Math.round(stats.sum / words.length) : 0,
  };
}
