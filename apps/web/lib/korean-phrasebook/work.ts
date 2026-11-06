import {
  phraseCardContentSchema,
  workContextSchema,
  type PhraseCardContentInput,
  type PhraseProvenance,
  type WorkContext,
} from "./schemas"

// "Korean for my work" — pure helpers shared by the analyzer's Save to
// Phrasebook flow, the work-reply practice and the mission engine. No
// Supabase, no fetch: lib/api/phrasebook.ts does the I/O.

/** Tag carried by every work-focus card (curated pack and saved messages). */
export const WORK_FOCUS_TAG = "work-focus"

/** Situation key for a message saved from the analyzer. */
export const CAPTURED_MESSAGE_SITUATION = "work-message"

/** source_key of the owner's own "My work messages" collection. */
export const WORK_CAPTURE_COLLECTION_KEY = "user-work-messages"

export const WORK_CAPTURE_COLLECTION = {
  sourceKey: WORK_CAPTURE_COLLECTION_KEY,
  titleKo: "내 업무 메시지",
  titleEn: "My work messages",
  description: "Work messages you analyzed and chose to keep, with a reply to practice.",
  category: "workplace",
} as const

// ── Likely-sensitive text detection ─────────────────────────────────────────
// A convenience before text goes to the AI provider, not a guarantee: it
// can't recognise names, project terms or anything company-specific. The UI
// says so; the learner edits the text, and the edited text is the payload.

export type SensitiveKind =
  "email" | "url" | "ip" | "phone" | "resident-id" | "token" | "ticket-id" | "password" | "sql"

export interface SensitiveFinding {
  kind: SensitiveKind
  match: string
  /** Whether replaceSensitive() swaps it for a placeholder. SQL isn't — it
   *  usually carries the meaning, so the learner should rewrite it. */
  replaceable: boolean
}

const SENSITIVE_PATTERNS: Array<{ kind: SensitiveKind; pattern: RegExp; placeholder?: string }> = [
  { kind: "token", pattern: /\beyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g, placeholder: "[토큰]" },
  {
    kind: "token",
    pattern: /\b(?:sk|pk|rk|ghp|gho|ghs|xox[abprs]|AKIA)[-_]?[A-Za-z0-9_-]{12,}/g,
    placeholder: "[토큰]",
  },
  { kind: "url", pattern: /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi, placeholder: "[링크]" },
  { kind: "email", pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, placeholder: "[이메일]" },
  { kind: "ip", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?\b/g, placeholder: "[IP]" },
  { kind: "resident-id", pattern: /\b\d{6}-?[1-8]\d{6}\b/g, placeholder: "[주민번호]" },
  {
    kind: "phone",
    pattern: /\b(?:01[016789]|0[2-6]\d?)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
    placeholder: "[전화번호]",
  },
  {
    kind: "password",
    pattern: /(?:password|passwd|pwd|비밀번호|비번)\s*[:=]\s*\S+/gi,
    placeholder: "[비밀번호]",
  },
  // Long opaque strings (keys, hashes) — 32+ chars of base64/hex alphabet.
  { kind: "token", pattern: /\b[A-Za-z0-9+/_-]{32,}={0,2}/g, placeholder: "[토큰]" },
  { kind: "ticket-id", pattern: /\b[A-Z][A-Z0-9]{1,9}-\d{1,7}\b/g, placeholder: "[작업번호]" },
  {
    kind: "sql",
    pattern:
      /\b(?:select\s[\s\S]{1,200}?\sfrom|insert\s+into|update\s+\w+\s+set|delete\s+from)\b/gi,
  },
]

export const SENSITIVE_KIND_LABEL: Record<SensitiveKind, string> = {
  email: "Email address",
  url: "Link",
  ip: "IP address",
  phone: "Phone number",
  "resident-id": "ID number",
  token: "Key or token",
  "ticket-id": "Task or ticket ID",
  password: "Password",
  sql: "SQL or code",
}

/** Distinct likely-sensitive fragments, in the order they appear. */
export function detectSensitiveText(text: string): SensitiveFinding[] {
  const found: Array<SensitiveFinding & { index: number }> = []
  const claimed: Array<[number, number]> = []
  for (const { kind, pattern, placeholder } of SENSITIVE_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const start = m.index ?? 0
      const end = start + m[0].length
      // A fragment already claimed by an earlier, more specific pattern
      // (a URL containing an IP) is reported once.
      if (claimed.some(([s, e]) => start < e && end > s)) continue
      claimed.push([start, end])
      found.push({ kind, match: m[0], replaceable: Boolean(placeholder), index: start })
    }
  }
  const seen = new Set<string>()
  return found
    .sort((a, b) => a.index - b.index)
    .filter((f) => {
      const key = `${f.kind}:${f.match}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(({ kind, match, replaceable }) => ({ kind, match, replaceable }))
}

/** Replaces every replaceable finding with a short Korean placeholder. */
export function replaceSensitive(text: string): string {
  let result = text
  for (const { pattern, placeholder } of SENSITIVE_PATTERNS) {
    if (!placeholder) continue
    result = result.replace(pattern, placeholder)
  }
  return result
}

// ── Stable capture key (idempotent Save to Phrasebook) ──────────────────────

export function normalizeKoreanText(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim()
}

function fnv1a(text: string, seed: number): string {
  let hash = seed >>> 0
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

/**
 * source_key for a saved work message: the same message + reply always gives
 * the same key, so a double click, a retry after a timeout, or saving the
 * same analysis twice hits the (user_id, source_key) unique index instead of
 * creating a second card.
 */
export function captureSourceKey(messageKorean: string, replyKorean: string): string {
  const text = `${normalizeKoreanText(messageKorean)}\u0000${normalizeKoreanText(replyKorean)}`
  return `capture-${fnv1a(text, 0x811c9dc5)}${fnv1a(text, 0x01000193)}`
}

// ── Analyzer result → editable card draft ───────────────────────────────────

export type PhraseRegister = "formal" | "polite"

/** Maps the analyzer's free-text formality to a card register. 반말 has no
 *  card register — a casual message is still practiced with a polite reply. */
export function registerFromFormality(formality: string | null | undefined): PhraseRegister {
  const f = (formality ?? "").toLowerCase()
  if (f.includes("격식") || f.includes("합니다") || f.includes("formal")) return "formal"
  return "polite"
}

export interface WorkAnalysisFields {
  originalText: string
  naturalMeaning: string
  politenessLevel: string
  mainPoint?: string
  requiredAction?: string
  conditions?: string[]
  deadline?: string
  expectedResult?: string
  unknowns?: string[]
  clarifyingQuestion?: string
  messageRomanization?: string
  recommendedReply?: { korean: string; romanization: string; english: string; register: string }
  usefulLanguage?: Array<{ korean: string; english: string; note?: string }>
}

export interface WorkCardDraft {
  /** The analyzed text exactly as sent — used only to decide quoted vs
   *  paraphrased; never stored separately. */
  originalText: string
  messageKorean: string
  messageRomanization: string
  messageEnglish: string
  messageRegister: PhraseRegister
  replyKorean: string
  replyRomanization: string
  replyEnglish: string
  replyRegister: PhraseRegister
  workContext: WorkContext
  vocabulary: Array<{ korean: string; english: string }>
  usageNote: string
  sourceLabel: string
}

const MAX_MESSAGE_CHARS = 300

function clip(text: string | undefined, max: number): string {
  const value = (text ?? "").trim()
  return value.length > max ? value.slice(0, max).trim() : value
}

/** Builds the editable draft the learner reviews before anything is saved. */
export function buildWorkCardDraft(
  analysis: WorkAnalysisFields,
  options: { sourceLabel?: string | null } = {},
): WorkCardDraft {
  const reply = analysis.recommendedReply
  const parsedContext = workContextSchema.safeParse({
    mainPoint: clip(analysis.mainPoint || analysis.naturalMeaning, 200) || "Work message",
    requiredAction: clip(analysis.requiredAction, 200),
    conditions: (analysis.conditions ?? [])
      .map((c) => clip(c, 160))
      .filter(Boolean)
      .slice(0, 5),
    deadline: clip(analysis.deadline, 80),
    expectedResult: clip(analysis.expectedResult, 200),
    unknowns: (analysis.unknowns ?? [])
      .map((u) => clip(u, 160))
      .filter(Boolean)
      .slice(0, 5),
    clarifyingQuestion: clip(analysis.clarifyingQuestion, 200),
    whyUseful: "",
  })
  const workContext: WorkContext = parsedContext.success
    ? parsedContext.data
    : {
        mainPoint: "Work message",
        requiredAction: "",
        conditions: [],
        deadline: "",
        expectedResult: "",
        unknowns: [],
        clarifyingQuestion: "",
        whyUseful: "",
      }

  const language = (analysis.usefulLanguage ?? []).filter(
    (v) => v.korean?.trim() && v.english?.trim(),
  )
  const pattern = language.find((v) => v.korean.includes("~"))

  return {
    originalText: analysis.originalText,
    // Long messages don't fit a card question (300 chars) — the learner is
    // asked to shorten it in the draft; we never cut it silently mid-sentence.
    messageKorean: normalizeKoreanText(analysis.originalText),
    messageRomanization: clip(analysis.messageRomanization, MAX_MESSAGE_CHARS),
    messageEnglish: clip(analysis.naturalMeaning, MAX_MESSAGE_CHARS),
    messageRegister: registerFromFormality(analysis.politenessLevel),
    replyKorean: clip(reply?.korean, MAX_MESSAGE_CHARS),
    replyRomanization: clip(reply?.romanization, MAX_MESSAGE_CHARS),
    replyEnglish: clip(reply?.english, MAX_MESSAGE_CHARS),
    replyRegister: registerFromFormality(reply?.register),
    workContext,
    vocabulary: language.slice(0, 5).map((v) => ({
      korean: clip(v.korean, 80),
      english: clip(v.english, 120),
    })),
    usageNote: pattern ? clip(`Pattern: ${pattern.korean} — ${pattern.english}`, 1000) : "",
    sourceLabel: clip(options.sourceLabel ?? "", 100),
  }
}

/** quoted when the saved Korean is the analyzed text unchanged, otherwise
 *  paraphrased — so an edited message is never presented as a quotation. */
export function draftProvenance(
  draft: Pick<WorkCardDraft, "originalText" | "messageKorean">,
): PhraseProvenance {
  return normalizeKoreanText(draft.originalText) === normalizeKoreanText(draft.messageKorean)
    ? "quoted"
    : "paraphrased"
}

export type DraftValidation =
  { ok: true; content: PhraseCardContentInput; sourceKey: string } | { ok: false; errors: string[] }

/** Validates the reviewed draft against the same card schema every other
 *  Phrasebook write uses (romanization and English stay required). */
export function draftToCardContent(draft: WorkCardDraft): DraftValidation {
  const errors: string[] = []
  if (draft.messageKorean.length > MAX_MESSAGE_CHARS)
    errors.push(`Shorten the message to ${MAX_MESSAGE_CHARS} characters or fewer.`)
  const parsed = phraseCardContentSchema.safeParse({
    category: "workplace",
    situation: CAPTURED_MESSAGE_SITUATION,
    difficulty: "medium",
    question: {
      korean: draft.messageKorean,
      romanization: draft.messageRomanization,
      english: draft.messageEnglish,
      register: draft.messageRegister,
    },
    questionVariants: [],
    answers: [
      {
        korean: draft.replyKorean,
        romanization: draft.replyRomanization,
        english: draft.replyEnglish,
        register: draft.replyRegister,
        usageNote: "AI-suggested reply — check it says what you mean before using it.",
        isRecommended: true,
      },
    ],
    usageNote: draft.usageNote || undefined,
    vocabulary: draft.vocabulary,
    tags: [WORK_FOCUS_TAG],
    workContext: draft.workContext,
    provenance: draftProvenance(draft),
    sourceLabel: draft.sourceLabel || undefined,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(describeIssue(issue.path))
  }
  if (errors.length > 0 || !parsed.success) return { ok: false, errors: [...new Set(errors)] }
  return {
    ok: true,
    content: parsed.data,
    sourceKey: captureSourceKey(draft.messageKorean, draft.replyKorean),
  }
}

function describeIssue(path: PropertyKey[]): string {
  const key = path.map(String).join(".")
  if (key.startsWith("question.romanization")) return "Add romanization for the message."
  if (key.startsWith("question.english")) return "Add the English meaning of the message."
  if (key.startsWith("question.korean"))
    return "The message can't be empty and must be 300 characters or fewer."
  if (key.startsWith("answers.0.korean")) return "Add a Korean reply."
  if (key.startsWith("answers.0.romanization")) return "Add romanization for the reply."
  if (key.startsWith("answers.0.english")) return "Add the English meaning of the reply."
  if (key.startsWith("workContext")) return "Check the main point and action notes."
  if (key.startsWith("vocabulary")) return "Check the useful-language entries."
  return `Check the field “${key}”.`
}

// ── Card helpers ────────────────────────────────────────────────────────────

/** A card the work-reply practice can use: it has comprehension notes. */
export function isWorkMessageCard(card: {
  workContext: WorkContext | null
  tags: string[]
}): boolean {
  return card.workContext != null && card.tags.includes(WORK_FOCUS_TAG)
}
