// Listen-and-repeat drill domain logic: turns the candidate's script (or the
// study-pack phrases) into repeatable sentences, and grades a spoken repeat
// against its target sentence word by word — the Duolingo-style "which words
// did I hit / miss" comparison, done locally so grading is instant and free.

import type { InterviewTopic, PhraseEntry } from "./interview"

export interface RepeatSentence {
  id: string
  ko: string
  /** English gloss when the source provides one (phrases only). */
  en?: string
  /** Where the sentence came from, for the drill's context line. */
  sourceLabel: string
}

/** One target word, marked by whether the spoken repeat contained it. */
export interface RepeatWordMark {
  word: string
  hit: boolean
}

export type RepeatGrade = "perfect" | "good" | "retry"

/**
 * What each grade tells the learner. The grade compares a speech-to-text (or
 * typed) transcript with the target, so the labels describe a word match and
 * must never claim pronunciation quality. The "perfect" id is kept because
 * saved last-session summaries count it.
 */
export const REPEAT_GRADE_LABELS: Record<RepeatGrade, string> = {
  perfect: "Matched the sentence",
  good: "Close — check the missed words",
  retry: "Listen once more and try again",
}

export interface RepeatComparison {
  /** Target-sentence words in order, marked hit/miss. */
  marks: RepeatWordMark[]
  /** 0–100: share of target words the repeat contained. */
  wordAccuracy: number
  /** 0–100: character-level similarity — tolerant of spacing differences. */
  similarity: number
  grade: RepeatGrade
}

// ── Sentence sources ──────────────────────────────────────────────────────

/**
 * Splits script section text into individual repeatable sentences: newlines
 * first, then sentence-ending punctuation. Sentences shorter than a couple of
 * words aren't worth a rep and are dropped.
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter((s) => normalize(s).length >= 2)
}

/**
 * Builds the drill queue from the candidate's script sections, in outline
 * order (the memorization order). `sections` is the saved script; any section
 * left empty falls back to the topic's seed draft, matching the script editor.
 */
export function scriptToRepeatSentences(
  topic: InterviewTopic,
  sections: Record<string, string> | null,
): RepeatSentence[] {
  const outline = topic.scriptOutline ?? []
  return outline.flatMap((section) => {
    const text = sections?.[section.id]?.trim() || topic.scriptSeed?.[section.id] || ""
    return splitIntoSentences(text).map((ko, i) => ({
      id: `${section.id}-${i}`,
      ko,
      sourceLabel: section.titleKo,
    }))
  })
}

/** Builds the drill queue from the study pack's key phrases. */
export function phrasesToRepeatSentences(phrases: PhraseEntry[]): RepeatSentence[] {
  return phrases
    .filter((p) => normalize(p.ko).length >= 2)
    .map((p, i) => ({ id: `phrase-${i}`, ko: p.ko, en: p.en, sourceLabel: "Key phrase" }))
}

// ── Grading ───────────────────────────────────────────────────────────────

/** Strips punctuation/symbols so 좋아요! and 좋아요 compare equal. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

function tokenize(sentence: string): string[] {
  return sentence.split(/\s+/).map(normalize).filter(Boolean)
}

/** Classic Levenshtein distance, used for the spacing-tolerant similarity. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }
  return prev[b.length]
}

/**
 * Longest-common-subsequence keep-flags for the target tokens: which target
 * words appear, in order, in the spoken tokens. Order-preserving so a shuffled
 * repeat doesn't count as a hit-everything.
 */
function lcsHits(target: string[], spoken: string[]): boolean[] {
  const n = target.length
  const m = spoken.length
  // dp[i][j] = LCS length of target[i..] vs spoken[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        target[i] === spoken[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const hits = new Array<boolean>(n).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (target[i] === spoken[j]) {
      hits[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return hits
}

/**
 * Grades a spoken repeat against the target sentence.
 *
 * Word marks come from an order-preserving word match; the overall similarity
 * is character-level on the de-spaced text, so the STT writing 잘못 for 잘 못
 * (spacing-only differences) doesn't tank the score.
 */
export function compareRepeat(target: string, spoken: string): RepeatComparison {
  const targetWords = target.split(/\s+/).filter((w) => normalize(w))
  const targetTokens = targetWords.map(normalize)
  const spokenTokens = tokenize(spoken)

  const flatTarget = targetTokens.join("")
  const flatSpoken = spokenTokens.join("")
  const maxLen = Math.max(flatTarget.length, flatSpoken.length)
  const similarity =
    maxLen === 0 ? 0 : Math.round((1 - levenshtein(flatTarget, flatSpoken) / maxLen) * 100)

  const hits = lcsHits(targetTokens, spokenTokens)
  // A word the STT merged/re-spaced still counts as said when the de-spaced
  // spoken text contains it (e.g. target 잘 못 heard as 잘못).
  for (let i = 0; i < hits.length; i++) {
    if (!hits[i] && flatSpoken.includes(targetTokens[i])) {
      hits[i] = true
    }
  }

  const marks: RepeatWordMark[] = targetWords.map((word, i) => ({ word, hit: hits[i] }))
  const hitCount = hits.filter(Boolean).length
  const wordAccuracy = marks.length === 0 ? 0 : Math.round((hitCount / marks.length) * 100)

  const grade: RepeatGrade =
    similarity >= 90 && wordAccuracy >= 90
      ? "perfect"
      : similarity >= 65 || wordAccuracy >= 65
        ? "good"
        : "retry"

  return { marks, wordAccuracy, similarity, grade }
}
