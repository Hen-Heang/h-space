import { describe, expect, it } from "vitest"

import { phraseCardContentSchema } from "./schemas"
import { SEED_PACKS, seedContentKey } from "./seed"
import { WORK_CONTEXT_BY_SOURCE_KEY, WORK_FOCUS_CARDS } from "./work-seed"
import { WORK_FOCUS_TAG, detectSensitiveText } from "./work"
import { situationLabel, humanizeKey } from "./labels"

// Content checks for the "Korean for my work" starter pack. These prove
// structure (sizes, registers, provenance, no private identifiers) — not
// that every Korean sentence is perfect; that still needs a human read.

describe("Korean for my work pack", () => {
  it("has 24–30 cards, each valid against the shared card schema", () => {
    expect(WORK_FOCUS_CARDS.length).toBeGreaterThanOrEqual(24)
    expect(WORK_FOCUS_CARDS.length).toBeLessThanOrEqual(30)
    for (const card of WORK_FOCUS_CARDS) {
      const parsed = phraseCardContentSchema.safeParse(card)
      expect(parsed.success, card.sourceKey).toBe(true)
    }
  })

  it("has exactly six message-comprehension exercises", () => {
    const withContext = WORK_FOCUS_CARDS.filter((c) => c.workContext)
    expect(withContext).toHaveLength(6)
    expect(WORK_CONTEXT_BY_SOURCE_KEY.size).toBe(6)
    for (const card of withContext) {
      expect(card.workContext!.mainPoint.length).toBeGreaterThan(0)
      expect(card.workContext!.whyUseful.length).toBeGreaterThan(0)
    }
  })

  it("only states a deadline the message itself contains", () => {
    for (const card of WORK_FOCUS_CARDS.filter((c) => c.workContext?.deadline)) {
      // The one card with a deadline says "다음 주 배포 전까지" in the message.
      expect(card.question.korean).toMatch(/까지|전에|전까지/)
    }
  })

  it("gives every card 3–5 vocabulary entries, the work-focus tag and curated provenance", () => {
    for (const card of WORK_FOCUS_CARDS) {
      expect(card.vocabulary.length, card.sourceKey).toBeGreaterThanOrEqual(3)
      expect(card.vocabulary.length, card.sourceKey).toBeLessThanOrEqual(5)
      expect(card.tags).toContain(WORK_FOCUS_TAG)
      expect(card.provenance).toBe("curated")
    }
  })

  it("keeps replies short: at most three sentences", () => {
    for (const card of WORK_FOCUS_CARDS) {
      for (const answer of card.answers) {
        const sentences = answer.korean.split(/[.?!]/).filter((s) => s.trim()).length
        expect(sentences, `${card.sourceKey}: ${answer.korean}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it("contains no links, emails, IDs, tokens or SQL", () => {
    for (const card of WORK_FOCUS_CARDS) {
      const text = [
        card.question.korean,
        card.question.english,
        card.usageNote ?? "",
        ...card.answers.flatMap((a) => [a.korean, a.english]),
      ].join("\n")
      expect(detectSensitiveText(text), card.sourceKey).toEqual([])
    }
  })

  it("doesn't duplicate a card from the other starter packs", () => {
    const others = SEED_PACKS.filter((p) => p.sourceKey !== "work-communication").flatMap(
      (p) => p.cards,
    )
    const otherKeys = new Set(others.map(seedContentKey))
    const otherQuestions = new Set(others.map((c) => c.question.korean))
    for (const card of WORK_FOCUS_CARDS) {
      expect(otherKeys.has(seedContentKey(card)), card.sourceKey).toBe(false)
      expect(otherQuestions.has(card.question.korean), card.sourceKey).toBe(false)
    }
  })

  it("uses situations that all have a readable label", () => {
    for (const card of WORK_FOCUS_CARDS) {
      // A mapped label differs from the plain humanized key fallback.
      expect(situationLabel(card.situation), card.situation).not.toBe(humanizeKey(card.situation))
    }
  })
})
