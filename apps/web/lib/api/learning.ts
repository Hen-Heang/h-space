// Assorted single-purpose learning-feature endpoints, now split between
// Supabase tables (persistence, SRS) and app/api/ai routes (generation/grading).
import type {
  CorrectionReview,
  DailyPhrase,
  SentenceChallengeResponse,
  SentenceCheckResponse,
  GeneratedMessages,
  ListeningAttemptRecord,
  ListeningAttemptResult,
  ListeningLesson,
  MessageAnalysis,
  PracticeToday,
  QuizQuestion,
  ScenarioDetail,
} from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import { applyRating, type ReviewRating } from "@/lib/srs"
import { createCorrectionFingerprint } from "@/lib/learning/korean-text"
import { planCorrectionUpsert, type ExistingCorrectionState } from "@/lib/learning/corrections"
import { skillForCorrectionCategory, skillsForListeningTopic } from "@/lib/learning/skills"
import { analyzerOutputSchema } from "@/lib/ai/schemas/analyzer"
import { aiPost, authHeaders } from "./ai-client"
import { readSseStream } from "./sse"
import { skillsApi } from "./skills"
import { vocabApi } from "./vocab"

// ── Correction ──────────────────────────────────────────────────────────────

type CorrectionRow = {
  id: string
  original_text: string
  corrected_text: string
  natural_version: string | null
  explanation: string | null
  grammar_points: string[]
  mastery: number
  next_review_date: string
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  created_at: string
  error_category?: string | null
  severity?: "minor" | "important" | null
  occurrence_count?: number | null
}

function toCorrectionReview(row: CorrectionRow): CorrectionReview & { createdAt: string } {
  const naturalVersion = row.natural_version?.trim()
  return {
    createdAt: row.created_at,
    id: row.id,
    originalText: row.original_text,
    correctedText: row.corrected_text,
    naturalVersion:
      naturalVersion && naturalVersion !== row.corrected_text.trim() ? naturalVersion : undefined,
    explanation: row.explanation ?? undefined,
    grammarPoints: row.grammar_points ?? [],
    errorCategory: row.error_category ?? undefined,
    severity: row.severity ?? undefined,
    occurrenceCount: row.occurrence_count ?? 1,
    mastery: row.mastery,
    nextReviewDate: row.next_review_date,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    lapses: row.lapses,
  }
}

// Manual-check mistakes don't carry an explicit severity from the AI (unlike
// chat turn analysis) — derived from the overall rating instead: a low
// rating means the individual changes matter more.
function severityFromRating(rating: number): "minor" | "important" {
  return rating <= 3 ? "important" : "minor"
}

export const correctionApi = {
  // AI checks the text; if it found mistakes, each change is saved (deduped
  // by fingerprint) so it resurfaces on the SRS schedule, same as chat's
  // automatic turn analysis.
  //
  // `options` (work-reply practice): the learner's intended meaning and the
  // message they're answering, so meaning and tense are checked first.
  check: async (text: string, options: { intendedMeaning?: string; replyingTo?: string } = {}) => {
    const result = await aiPost<{
      originalText: string
      correctedText: string
      hasErrors: boolean
      rating: number
      explanation?: string
      grammarPoints?: string[]
      changes: Array<{
        original: string
        corrected: string
        englishMeaning: string
        reason: string
        category: string | null
      }>
      meaningPreserved?: boolean | null
      meaningNote?: string | null
      pattern?: string | null
    }>("/corrections/check", {
      text,
      ...(options.intendedMeaning?.trim()
        ? { intendedMeaning: options.intendedMeaning.trim() }
        : {}),
      ...(options.replyingTo?.trim()
        ? { replyingTo: options.replyingTo.trim().slice(0, 2000) }
        : {}),
    })

    if (result.hasErrors) {
      const userId = requireUserId()
      const severity = severityFromRating(result.rating)
      // Fall back to one whole-text row if the model returned no fragment-level
      // changes despite flagging errors, so the mistake is still saved.
      const changes =
        result.changes.length > 0
          ? result.changes
          : [
              {
                original: result.originalText,
                corrected: result.correctedText,
                englishMeaning: "",
                reason: result.explanation ?? "",
                category: null as string | null,
              },
            ]

      for (const change of changes) {
        const category = change.category ?? "expression"
        const fingerprint = createCorrectionFingerprint({
          originalText: change.original,
          correctedText: change.corrected,
          category,
        })
        const { data: existingRow } = await supabase
          .from("kori_corrections")
          .select(
            "mastery, ease_factor, interval_days, repetitions, lapses, occurrence_count, next_review_date",
          )
          .eq("user_id", userId)
          .eq("fingerprint", fingerprint)
          .maybeSingle()
        const existing: ExistingCorrectionState | null = existingRow
          ? {
              mastery: existingRow.mastery,
              easeFactor: existingRow.ease_factor,
              intervalDays: existingRow.interval_days,
              repetitions: existingRow.repetitions,
              lapses: existingRow.lapses,
              occurrenceCount: existingRow.occurrence_count,
              nextReviewDate: existingRow.next_review_date,
            }
          : null
        const plan = planCorrectionUpsert(existing, { severity })
        const row = {
          user_id: userId,
          original_text: change.original,
          corrected_text: change.corrected,
          explanation: change.reason || result.explanation || null,
          grammar_points: result.grammarPoints ?? [],
          mastery: plan.state.mastery,
          next_review_date: plan.state.nextReviewDate,
          ease_factor: plan.state.easeFactor,
          interval_days: plan.state.intervalDays,
          repetitions: plan.state.repetitions,
          lapses: plan.state.lapses,
          source_feature: "manual_check",
          error_category: category,
          severity,
          natural_version: result.correctedText,
          fingerprint,
          occurrence_count: plan.occurrenceCount,
          last_seen_at: new Date().toISOString(),
        }
        if (plan.action === "insert") {
          await supabase.from("kori_corrections").insert(row)
        } else {
          await supabase
            .from("kori_corrections")
            .update(row)
            .eq("user_id", userId)
            .eq("fingerprint", fingerprint)
        }

        void skillsApi.recordEvent({
          skillCode: skillForCorrectionCategory(category),
          sourceFeature: "corrections_check",
          score: result.rating * 20,
          difficulty: "medium",
        })
      }
    }
    return result
  },

  history: async (limit = 10) => {
    const { data, error } = await supabase
      .from("kori_corrections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as CorrectionRow[]).map(toCorrectionReview)
  },

  getDueReviews: async (): Promise<CorrectionReview[]> => {
    const { data, error } = await supabase
      .from("kori_corrections")
      .select("*")
      .lte("next_review_date", new Date().toISOString())
      .order("next_review_date", { ascending: true })
    if (error) throw error
    return (data as CorrectionRow[]).map(toCorrectionReview)
  },

  // Mirrors lib/api/vocab.ts's RATING_SCORE so SRS grading contributes
  // comparable skill-mastery evidence across vocab and correction cards.
  rate: async (id: string | number, rating: ReviewRating): Promise<CorrectionReview> => {
    const { data: row, error } = await supabase
      .from("kori_corrections")
      .select("*")
      .eq("id", String(id))
      .single()
    if (error) throw error
    const c = row as CorrectionRow
    const next = applyRating(
      {
        easeFactor: c.ease_factor,
        intervalDays: c.interval_days,
        repetitions: c.repetitions,
        lapses: c.lapses,
        mastery: c.mastery,
      },
      rating,
    )
    const { data: updated, error: updateError } = await supabase
      .from("kori_corrections")
      .update({
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        mastery: next.mastery,
        next_review_date: next.nextReview,
      })
      .eq("id", String(id))
      .select()
      .single()
    if (updateError) throw updateError
    void skillsApi.recordEvent({
      skillCode: skillForCorrectionCategory(c.error_category ?? "expression"),
      sourceFeature: "corrections_srs",
      sourceId: String(id),
      score: { AGAIN: 15, HARD: 55, GOOD: 80, EASY: 100 }[rating],
    })
    return toCorrectionReview(updated as CorrectionRow)
  },

  remove: async (id: string | number) => {
    const { error } = await supabase.from("kori_corrections").delete().eq("id", String(id))
    if (error) throw error
  },
}

// ── Daily Phrase ────────────────────────────────────────────────────────────

type DailyPhraseRow = {
  id: string
  date: string
  phrase: string
  meaning: string
  romanization: string | null
  when_to_use: string | null
  formality: string | null
  similar_expressions: DailyPhrase["similarExpressions"]
  learned: boolean
}

function toDailyPhrase(row: DailyPhraseRow): DailyPhrase {
  return {
    id: row.id,
    date: row.date,
    phrase: row.phrase,
    meaning: row.meaning,
    romanization: row.romanization ?? undefined,
    whenToUse: row.when_to_use ?? undefined,
    formality: row.formality ?? undefined,
    similarExpressions: row.similar_expressions ?? [],
    learned: row.learned,
  }
}

export const dailyPhraseApi = {
  // Today's phrase; generated on first request of the day.
  getToday: async (): Promise<DailyPhrase> => {
    const today = new Date().toISOString().slice(0, 10)
    const { data: existing, error } = await supabase
      .from("kori_daily_phrases")
      .select("*")
      .eq("date", today)
      .maybeSingle()
    if (error) throw error
    if (existing) return toDailyPhrase(existing as DailyPhraseRow)

    const generated = await aiPost<{
      phrase: string
      meaning: string
      romanization?: string
      whenToUse?: string
      formality?: string
      similarExpressions?: DailyPhrase["similarExpressions"]
    }>("/daily-phrase/generate", {})
    const { data: row, error: insertError } = await supabase
      .from("kori_daily_phrases")
      .insert({
        user_id: requireUserId(),
        date: today,
        phrase: generated.phrase,
        meaning: generated.meaning,
        romanization: generated.romanization ?? null,
        when_to_use: generated.whenToUse ?? null,
        formality: generated.formality ?? null,
        similar_expressions: generated.similarExpressions ?? [],
      })
      .select()
      .single()
    if (insertError) throw insertError
    return toDailyPhrase(row as DailyPhraseRow)
  },

  getHistory: async (): Promise<DailyPhrase[]> => {
    const { data, error } = await supabase
      .from("kori_daily_phrases")
      .select("*")
      .order("date", { ascending: false })
    if (error) throw error
    return (data as DailyPhraseRow[]).map(toDailyPhrase)
  },

  markLearned: async (id: string, learned = true) => {
    const { error } = await supabase.from("kori_daily_phrases").update({ learned }).eq("id", id)
    if (error) throw error
  },

  addToFlashcards: async (id: string) => {
    const { data, error } = await supabase
      .from("kori_daily_phrases")
      .select("phrase, meaning")
      .eq("id", id)
      .single()
    if (error) throw error
    return vocabApi.save({ category: "Daily Phrase", term: data.phrase, meaning: data.meaning })
  },

  getPractice: async (id: string) => {
    const { data, error } = await supabase
      .from("kori_daily_phrases")
      .select("id, phrase, meaning")
      .eq("id", id)
      .single()
    if (error) throw error
    return aiPost<SentenceChallengeResponse>("/daily-phrase/practice", {
      phrase: data.phrase,
      meaning: data.meaning,
    })
  },

  checkPractice: (id: string, data: { challengePrompt: string; attempt: string }) =>
    aiPost<SentenceCheckResponse>("/daily-phrase/check-practice", data),
}

// ── Workplace Message Generator ─────────────────────────────────────────────

// Category list was a backend constant; now a frontend one.
const MESSAGE_CATEGORIES = [
  "Leave request",
  "Meeting scheduling",
  "Status update",
  "Asking for help",
  "Apology / delay",
  "Announcement",
  "Thanks / appreciation",
  "Code review comment",
]

export const messageGenApi = {
  getCategories: async (): Promise<string[]> => MESSAGE_CATEGORIES,
  generate: (intent: string, category?: string) =>
    aiPost<GeneratedMessages>("/message-generator", { intent, category }),
}

// ── Listening Practice ──────────────────────────────────────────────────────

const LISTENING_TOPICS = [
  "Daily standup",
  "Sprint planning",
  "Code review discussion",
  "Lunch with coworkers",
  "IT helpdesk call",
  "Team dinner (회식)",
  "One-on-one with manager",
  "Client meeting",
]

type ListeningRow = {
  id: string
  topic: string
  title: string
  level: string
  lines: ListeningLesson["lines"]
  quiz: QuizQuestion[]
  created_at: string
}

function toLesson(row: ListeningRow): ListeningLesson {
  return {
    id: row.id,
    topic: row.topic,
    title: row.title,
    level: row.level,
    lines: row.lines ?? [],
    quiz: row.quiz ?? [],
    createdAt: row.created_at,
  }
}

export const listeningApi = {
  getTopics: async (): Promise<string[]> => LISTENING_TOPICS,

  generate: async (topic: string): Promise<ListeningLesson> => {
    const generated = await aiPost<{
      title: string
      level: string
      lines: ListeningLesson["lines"]
      quiz: QuizQuestion[]
    }>("/listening/generate", { topic })
    const { data, error } = await supabase
      .from("kori_listening_lessons")
      .insert({
        user_id: requireUserId(),
        topic,
        title: generated.title,
        level: generated.level ?? "Beginner",
        lines: generated.lines ?? [],
        quiz: generated.quiz ?? [],
      })
      .select()
      .single()
    if (error) throw error
    return toLesson(data as ListeningRow)
  },

  getLessons: async (): Promise<ListeningLesson[]> => {
    const { data, error } = await supabase
      .from("kori_listening_lessons")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return (data as ListeningRow[]).map(toLesson)
  },

  getLesson: async (id: string): Promise<ListeningLesson> => {
    const { data, error } = await supabase
      .from("kori_listening_lessons")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return toLesson(data as ListeningRow)
  },

  // Graded client-side against the stored quiz; the attempt row is history.
  submitAttempt: async (lessonId: string, answers: number[]): Promise<ListeningAttemptResult> => {
    const lesson = await listeningApi.getLesson(lessonId)
    const results = lesson.quiz.map((q, i) => answers[i] === q.answerIndex)
    const score = results.filter(Boolean).length
    const total = lesson.quiz.length
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0
    const { error } = await supabase.from("kori_listening_attempts").insert({
      user_id: requireUserId(),
      lesson_id: lessonId,
      score,
      total,
      accuracy,
      results,
    })
    if (error) throw error
    for (const skillCode of skillsForListeningTopic(lesson.topic)) {
      void skillsApi.recordEvent({
        skillCode,
        sourceFeature: "listening_quiz",
        sourceId: lessonId,
        score: accuracy,
      })
    }
    return { lessonId, score, total, accuracy, results }
  },

  // Attempt history for the Learning workspace's listening-progress snapshot.
  getAttempts: async (): Promise<ListeningAttemptRecord[]> => {
    const { data, error } = await supabase
      .from("kori_listening_attempts")
      .select("id, lesson_id, score, total, accuracy, results, created_at")
      .order("created_at", { ascending: false })
    if (error) throw error
    return (
      data as Array<{
        id: string
        lesson_id: string
        score: number
        total: number
        accuracy: number
        results: boolean[]
        created_at: string
      }>
    ).map((row) => ({
      id: row.id,
      lessonId: row.lesson_id,
      score: row.score,
      total: row.total,
      accuracy: row.accuracy,
      results: row.results,
      createdAt: row.created_at,
    }))
  },
}

// ── Scenarios ───────────────────────────────────────────────────────────────

type ScenarioRow = {
  id: string
  title: string
  category: string
  level: string
  summary: string
  goal: string
  intro_message: string | null
}

function toScenario(row: ScenarioRow): ScenarioDetail {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    level: row.level as ScenarioDetail["level"],
    summary: row.summary,
    goal: row.goal,
    introMessage: row.intro_message ?? undefined,
  }
}

export const scenarioApi = {
  getList: async (): Promise<ScenarioDetail[]> => {
    const { data, error } = await supabase.from("kori_scenarios").select("*").order("id")
    if (error) throw error
    return (data as ScenarioRow[]).map(toScenario)
  },
  getById: async (id: string): Promise<ScenarioDetail> => {
    const { data, error } = await supabase.from("kori_scenarios").select("*").eq("id", id).single()
    if (error) throw error
    return toScenario(data as ScenarioRow)
  },
}

// ── Workplace Korean Analyzer (Module 9) ────────────────────────────────────

type AnalyzerRow = {
  id: string
  source: string | null
  original_text: string
  analysis: Omit<MessageAnalysis, "id" | "source" | "originalText" | "modelUsed" | "createdAt">
  model_used: string | null
  created_at: string
}

function toAnalysis(row: AnalyzerRow): MessageAnalysis {
  return {
    ...row.analysis,
    id: row.id,
    source: row.source,
    originalText: row.original_text,
    modelUsed: row.model_used ?? "",
    createdAt: row.created_at,
  }
}

type AnalyzerResult = Omit<MessageAnalysis, "id" | "source" | "createdAt">
export type PartialAnalyzerResult = DeepPartial<AnalyzerResult>

type DeepPartial<T> =
  T extends Array<infer U>
    ? Array<DeepPartial<U> | undefined>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

export interface AnalyzeOptions {
  /** Aborts the request (and the server-side generation) — e.g. on navigation. */
  signal?: AbortSignal
  /** Store the message and its analysis in kori_analyzer_history. Off by
   *  default: the pasted text stays transient unless the learner opts in. */
  saveHistory?: boolean
}

// SSE stream from the Next.js route (start → partial* → done → error) — lets
// the UI render each field/breakdown item as it's generated instead of
// waiting for the whole structured object. Only `done` is a finished result.
async function streamAnalysis(
  text: string,
  source: string | undefined,
  onPartial: ((partial: PartialAnalyzerResult) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<AnalyzerResult> {
  const response = await fetch("/api/ai/analyzer", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ text, source }),
    signal,
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(
      response.status === 429
        ? (payload?.error ?? "Daily AI limit reached. Try again tomorrow.")
        : response.status === 401
          ? "Your session expired. Sign in again and retry."
          : "The analysis couldn't start. Please try again.",
    )
  }

  let final: AnalyzerResult | null = null
  await readSseStream(response, (event, raw) => {
    if (event === "partial") {
      try {
        onPartial?.(JSON.parse(raw) as PartialAnalyzerResult)
      } catch {
        /* ignore malformed chunk */
      }
    } else if (event === "done") {
      final = JSON.parse(raw) as AnalyzerResult
    } else if (event === "error") {
      let msg = "Failed to analyze the message."
      try {
        msg = JSON.parse(raw).message || msg
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
  })
  if (!final) throw new Error("The analysis stopped before it finished. Please try again.")
  // Only a complete, valid result counts — anything else is a retryable error,
  // never a half-finished lesson the learner could save.
  const checked = analyzerOutputSchema.safeParse(final)
  if (!checked.success) throw new Error("The analysis came back incomplete. Please try again.")
  return checked.data
}

export const analyzerApi = {
  analyze: async (
    text: string,
    source?: string,
    onPartial?: (partial: PartialAnalyzerResult) => void,
    options: AnalyzeOptions = {},
  ): Promise<MessageAnalysis> => {
    const analysis = await streamAnalysis(text, source, onPartial, options.signal)
    if (!options.saveHistory) {
      return { ...analysis, id: "", source: source ?? null, createdAt: new Date().toISOString() }
    }
    const { originalText: _o, modelUsed, ...rest } = analysis
    const { data, error } = await supabase
      .from("kori_analyzer_history")
      .insert({
        user_id: requireUserId(),
        source: source ?? null,
        original_text: text,
        analysis: rest,
        model_used: modelUsed ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return toAnalysis(data as AnalyzerRow)
  },

  history: async (limit = 30): Promise<MessageAnalysis[]> => {
    const { data, error } = await supabase
      .from("kori_analyzer_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as AnalyzerRow[]).map(toAnalysis)
  },
}

// ── Daily Practice Hub ──────────────────────────────────────────────────────
// Aggregated client-side now (the backend used to compose this response).

const FALLBACK_SCENARIO: ScenarioDetail = {
  id: "daily-standup",
  title: "Daily Standup",
  category: "Meetings",
  level: "Beginner",
  summary: "Report yesterday's work, today's plan, and blockers in Korean.",
  goal: "Give a 3-sentence standup update.",
}

export const practiceApi = {
  getToday: async (): Promise<PracticeToday> => {
    const [profileRes, dueVocab, dueVocabCount, dueCorrections, dailyPhrase, scenarios] =
      await Promise.all([
        supabase.from("kori_profiles").select("korean_level").maybeSingle(),
        vocabApi.getDueWords(),
        vocabApi.getDueCount(),
        correctionApi.getDueReviews(),
        dailyPhraseApi.getToday(),
        scenarioApi.getList().catch(() => [] as ScenarioDetail[]),
      ])
    const scenario =
      scenarios.length > 0
        ? scenarios[Math.floor(Math.random() * scenarios.length)]
        : FALLBACK_SCENARIO
    return {
      userLevel: profileRes.data?.korean_level ?? "BEGINNER",
      dueVocabCount,
      dueVocabSample: dueVocab.slice(0, 5),
      dueCorrectionsCount: dueCorrections.length,
      dueCorrectionsSample: dueCorrections.slice(0, 5),
      dailyPhrase,
      suggestedScenario: scenario,
      suggestedMessageCategory:
        MESSAGE_CATEGORIES[Math.floor(Math.random() * MESSAGE_CATEGORIES.length)],
      suggestedListeningTopic:
        LISTENING_TOPICS[Math.floor(Math.random() * LISTENING_TOPICS.length)],
    }
  },
}
