import { z } from "zod"

// Structured output of the Workplace Message Analyzer (app/api/ai/analyzer).
//
// Field order is the streaming order: the main point and the required action
// arrive first, so the UI can show them before the detailed grammar. The
// original fields (literalMeaning … suggestedReplies, modelUsed) are kept
// unchanged for existing consumers and stored history; the work-focus fields
// are additions. Every field is required here because the provider's strict
// JSON mode needs it; "nothing" is an empty string or array, never an
// invented value. Array/string limits are applied afterwards by
// finalizeAnalysis() (strict mode doesn't enforce maxItems reliably).

export const analyzerOutputSchema = z.object({
  originalText: z.string(),
  mainPoint: z.string(),
  requiredAction: z.string(),
  conditions: z.array(z.string()),
  deadline: z.string(),
  expectedResult: z.string(),
  unknowns: z.array(z.string()),
  clarifyingQuestion: z.string(),
  recommendedReply: z.object({
    korean: z.string(),
    romanization: z.string(),
    english: z.string(),
    register: z.enum(["polite", "formal"]),
  }),
  usefulLanguage: z.array(z.object({ korean: z.string(), english: z.string(), note: z.string() })),
  messageRomanization: z.string(),
  literalMeaning: z.string(),
  naturalMeaning: z.string(),
  businessContext: z.string(),
  politenessLevel: z.string(),
  tone: z.string(),
  breakdown: z.array(z.object({ fragment: z.string(), meaning: z.string(), note: z.string() })),
  suggestedReplies: z.array(
    z.object({ korean: z.string(), english: z.string(), formality: z.string() }),
  ),
  modelUsed: z.string(),
})

export type AnalyzerOutput = z.infer<typeof analyzerOutputSchema>

export const ANALYZER_LIMITS = {
  conditions: 5,
  unknowns: 5,
  usefulLanguage: 5,
  breakdown: 8,
  suggestedReplies: 3,
  shortText: 300,
  longText: 1200,
} as const

function clip(value: string, max: number): string {
  const trimmed = (value ?? "").trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trim()}…` : trimmed
}

function clipList(values: string[], maxItems: number, maxChars: number): string[] {
  return (values ?? [])
    .map((v) => clip(v, maxChars))
    .filter(Boolean)
    .slice(0, maxItems)
}

/**
 * Final server-side pass before the `done` event: caps every array and
 * string, drops empty entries, and replaces originalText / modelUsed with
 * the server's own values (the model never decides what the learner sent).
 */
export function finalizeAnalysis(
  object: AnalyzerOutput,
  trusted: { originalText: string; modelUsed: string },
): AnalyzerOutput {
  const { shortText, longText } = ANALYZER_LIMITS
  // A long message can't be a Phrasebook card question, so its romanization
  // isn't needed (and would be the longest part of the output).
  const messageRomanization =
    trusted.originalText.length <= shortText ? clip(object.messageRomanization, shortText) : ""
  return {
    originalText: trusted.originalText,
    mainPoint: clip(object.mainPoint, shortText),
    requiredAction: clip(object.requiredAction, shortText),
    conditions: clipList(object.conditions, ANALYZER_LIMITS.conditions, 160),
    deadline: clip(object.deadline, 80),
    expectedResult: clip(object.expectedResult, shortText),
    unknowns: clipList(object.unknowns, ANALYZER_LIMITS.unknowns, 160),
    clarifyingQuestion: clip(object.clarifyingQuestion, shortText),
    recommendedReply: {
      korean: clip(object.recommendedReply?.korean ?? "", shortText),
      romanization: clip(object.recommendedReply?.romanization ?? "", shortText),
      english: clip(object.recommendedReply?.english ?? "", shortText),
      register: object.recommendedReply?.register === "formal" ? "formal" : "polite",
    },
    usefulLanguage: (object.usefulLanguage ?? [])
      .map((v) => ({
        korean: clip(v.korean, 80),
        english: clip(v.english, 120),
        note: clip(v.note, 200),
      }))
      .filter((v) => v.korean && v.english)
      .slice(0, ANALYZER_LIMITS.usefulLanguage),
    messageRomanization,
    literalMeaning: clip(object.literalMeaning, longText),
    naturalMeaning: clip(object.naturalMeaning, longText),
    businessContext: clip(object.businessContext, longText),
    politenessLevel: clip(object.politenessLevel, shortText),
    tone: clip(object.tone, shortText),
    breakdown: (object.breakdown ?? [])
      .map((b) => ({
        fragment: clip(b.fragment, 120),
        meaning: clip(b.meaning, 200),
        note: clip(b.note, 400),
      }))
      .filter((b) => b.fragment)
      .slice(0, ANALYZER_LIMITS.breakdown),
    suggestedReplies: (object.suggestedReplies ?? [])
      .map((r) => ({
        korean: clip(r.korean, shortText),
        english: clip(r.english, shortText),
        formality: clip(r.formality, 80),
      }))
      .filter((r) => r.korean)
      .slice(0, ANALYZER_LIMITS.suggestedReplies),
    modelUsed: trusted.modelUsed,
  }
}

/** The main-point-first rules, kept here so tests can assert on them. */
export const ANALYZER_RULES = [
  "Lead with understanding, not grammar. mainPoint: ONE short English sentence saying what the message is about.",
  "requiredAction: what the reader is asked to do (action + target), in short English. Empty string if nothing is requested.",
  "conditions: only conditions the message states explicitly (included/excluded, only, before/after, 이상/초과/이하/미만). Empty array if none.",
  "deadline: only a deadline or time the message states. If none is stated, use an empty string — never guess or infer one.",
  "expectedResult: the result the sender expects, only if stated or directly implied by the request. Empty string otherwise.",
  "unknowns: what the message leaves unclear — an ambiguous 이것/그것/그 건/이 부분, a missing target, criterion or deadline. Do not resolve ambiguity yourself; list it here.",
  "clarifyingQuestion: if unknowns is not empty, one short polite Korean question (해요체 or 합니다체) that asks about the most important unknown; otherwise an empty string.",
  "Never invent requested actions, commitments, deadlines or emotional intent. Keep explicit facts (mainPoint, requiredAction, conditions, deadline) separate from interpretation (businessContext).",
  'recommendedReply: ONE short reply of 1–3 sentences the reader could send, in 해요체 (register "polite") or 합니다체 (register "formal") — both are polite; never 반말. If something is unclear, the reply should confirm understanding or ask the clarifying question rather than promise anything. It must not claim work is done, tested or reviewed unless the message says so. Give its romanization (Revised Romanization) and a short English meaning.',
  "usefulLanguage: 3–5 words or patterns from the message or reply worth learning, each with its meaning in THIS context and a short note; write patterns with ~ (e.g. ~는 대로).",
  "messageRomanization: Revised Romanization of the whole original message if it is 300 characters or shorter, otherwise an empty string.",
  "breakdown: only the key phrases and honorifics (at most 8), not every word.",
  "Keep every English explanation short and plain.",
] as const
