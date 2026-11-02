// Character-level diff between what the learner said and the corrected
// sentence, for highlighting exactly what changed. Korean corrections are
// usually a particle or an ending inside one word, so this works on
// characters (Hangul syllables), not words. Display only — nothing is scored
// or stored from it.

export type DiffSegment = { type: "same" | "added" | "removed"; text: string }

// Above this many cells the LCS table gets too big for an interactive render;
// callers fall back to showing the two sentences plainly.
const MAX_CELLS = 250_000

/**
 * Segments that turn `before` into `after`: unchanged runs, removed runs (only
 * in `before`), and added runs (only in `after`). Adjacent segments of the
 * same type are merged. Returns null when the inputs are too long to diff.
 */
export function diffText(before: string, after: string): DiffSegment[] | null {
  const a = Array.from(before)
  const b = Array.from(after)
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) return null

  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:].
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const segments: DiffSegment[] = []
  const push = (type: DiffSegment["type"], text: string) => {
    const last = segments[segments.length - 1]
    if (last?.type === type) last.text += text
    else segments.push({ type, text })
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("removed", a[i])
      i++
    } else {
      push("added", b[j])
      j++
    }
  }
  while (i < a.length) push("removed", a[i++])
  while (j < b.length) push("added", b[j++])
  return segments
}

/**
 * Share of characters that changed, 0–1 — counted over both sentences so a
 * rewrite scores high whether it grew or shrank. Whitespace is ignored.
 */
export function changedRatio(segments: DiffSegment[]): number {
  let same = 0
  let changed = 0
  for (const segment of segments) {
    const length = segment.text.replace(/\s/g, "").length
    if (segment.type === "same") same += length * 2
    else changed += length
  }
  const total = same + changed
  return total === 0 ? 0 : changed / total
}
