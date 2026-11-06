import { describe, expect, it } from "vitest"

import {
  ANALYZER_LIMITS,
  ANALYZER_RULES,
  analyzerOutputSchema,
  finalizeAnalysis,
  type AnalyzerOutput,
} from "./analyzer"

// Deterministic checks on the analyzer contract. They prove the server caps
// and normalizes whatever the model returns — not that the model's Korean is
// right (that still needs a human read of real outputs).

function output(overrides: Partial<AnalyzerOutput> = {}): AnalyzerOutput {
  return {
    originalText: "model-echoed text",
    mainPoint: "  Change the counting criterion.  ",
    requiredAction: "Change the criterion.",
    conditions: ["Only successful items", "", "Exclude failed items"],
    deadline: "",
    expectedResult: "",
    unknowns: [],
    clarifyingQuestion: "",
    recommendedReply: {
      korean: "네, 확인하겠습니다.",
      romanization: "ne, hwaginhagetseumnida.",
      english: "OK, I'll check.",
      register: "formal",
    },
    usefulLanguage: [{ korean: "집계", english: "count", note: "" }],
    messageRomanization: "jipgye gijuneul bakkwo juseyo.",
    literalMeaning: "literal",
    naturalMeaning: "natural",
    businessContext: "context",
    politenessLevel: "존댓말 (polite)",
    tone: "neutral",
    breakdown: [{ fragment: "주세요", meaning: "please", note: "" }],
    suggestedReplies: [{ korean: "넵", english: "OK", formality: "반말 (casual)" }],
    modelUsed: "something-else",
    ...overrides,
  }
}

describe("finalizeAnalysis", () => {
  it("uses the server's text and model name, never the model's echo", () => {
    const final = finalizeAnalysis(output(), { originalText: "보낸 메시지", modelUsed: "gpt-x" })
    expect(final.originalText).toBe("보낸 메시지")
    expect(final.modelUsed).toBe("gpt-x")
  })

  it("trims strings and drops empty list entries", () => {
    const final = finalizeAnalysis(output(), { originalText: "m", modelUsed: "x" })
    expect(final.mainPoint).toBe("Change the counting criterion.")
    expect(final.conditions).toEqual(["Only successful items", "Exclude failed items"])
  })

  it("caps every array", () => {
    const many = Array.from({ length: 20 }, (_, i) => `item ${i}`)
    const final = finalizeAnalysis(
      output({
        conditions: many,
        unknowns: many,
        usefulLanguage: many.map((k) => ({ korean: k, english: k, note: "" })),
        breakdown: many.map((k) => ({ fragment: k, meaning: k, note: "" })),
        suggestedReplies: many.map((k) => ({ korean: k, english: k, formality: "" })),
      }),
      { originalText: "m", modelUsed: "x" },
    )
    expect(final.conditions).toHaveLength(ANALYZER_LIMITS.conditions)
    expect(final.unknowns).toHaveLength(ANALYZER_LIMITS.unknowns)
    expect(final.usefulLanguage).toHaveLength(ANALYZER_LIMITS.usefulLanguage)
    expect(final.breakdown).toHaveLength(ANALYZER_LIMITS.breakdown)
    expect(final.suggestedReplies).toHaveLength(ANALYZER_LIMITS.suggestedReplies)
  })

  it("caps long strings", () => {
    const final = finalizeAnalysis(output({ mainPoint: "a".repeat(5000) }), {
      originalText: "m",
      modelUsed: "x",
    })
    expect(final.mainPoint.length).toBeLessThanOrEqual(ANALYZER_LIMITS.shortText)
  })

  it("keeps a missing deadline empty rather than filling it in", () => {
    const final = finalizeAnalysis(output({ deadline: "   " }), {
      originalText: "m",
      modelUsed: "x",
    })
    expect(final.deadline).toBe("")
  })

  it("drops message romanization for a message too long to be a card", () => {
    const final = finalizeAnalysis(output(), { originalText: "가".repeat(301), modelUsed: "x" })
    expect(final.messageRomanization).toBe("")
  })

  it("only allows polite or formal for the recommended reply", () => {
    const weird = output({
      recommendedReply: {
        korean: "응",
        romanization: "eung",
        english: "yeah",
        register: "casual" as "polite",
      },
    })
    expect(
      finalizeAnalysis(weird, { originalText: "m", modelUsed: "x" }).recommendedReply.register,
    ).toBe("polite")
  })

  it("produces output that still matches the schema existing consumers rely on", () => {
    const final = finalizeAnalysis(output(), { originalText: "m", modelUsed: "x" })
    expect(analyzerOutputSchema.safeParse(final).success).toBe(true)
    for (const key of [
      "literalMeaning",
      "naturalMeaning",
      "businessContext",
      "politenessLevel",
      "tone",
      "breakdown",
      "suggestedReplies",
    ] as const) {
      expect(final).toHaveProperty(key)
    }
  })
})

describe("ANALYZER_RULES", () => {
  const rules = ANALYZER_RULES.join("\n")
  it("leads with the main point and the required action", () => {
    expect(ANALYZER_RULES[0]).toMatch(/mainPoint/)
    expect(ANALYZER_RULES[1]).toMatch(/requiredAction/)
  })
  it("forbids invented deadlines, actions and commitments, and keeps ambiguity", () => {
    expect(rules).toMatch(/never guess or infer/)
    expect(rules).toMatch(/Never invent requested actions, commitments, deadlines/)
    expect(rules).toMatch(/Do not resolve ambiguity yourself/)
  })
  it("never treats 해요체 as casual and never claims unconfirmed completion", () => {
    expect(rules).toMatch(/both are polite; never 반말/)
    expect(rules).toMatch(/must not claim work is done, tested or reviewed/)
  })
})
