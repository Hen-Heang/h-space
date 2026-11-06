import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import type { ReviewRating } from "@/lib/srs"
import { createCorrectionFingerprint } from "@/lib/learning/korean-text"
import { planCorrectionUpsert, type ExistingCorrectionState } from "@/lib/learning/corrections"
import {
  deriveState,
  isCardDue,
  rateProgress,
  selectPracticeQueue,
  type PhraseSelectionOptions,
} from "@/lib/korean-phrasebook/mastery"
import {
  planSeedUpsert,
  seedContentKey,
  type ExistingSeedCard,
  type ExistingSeedCollection,
} from "@/lib/korean-phrasebook/seed"
import {
  phraseCardContentSchema,
  phraseCollectionInputSchema,
  workContextSchema,
  type PhraseCardContentInput,
  type PhraseProvenance,
  type WorkContext,
} from "@/lib/korean-phrasebook/schemas"
import { WORK_CONTEXT_BY_SOURCE_KEY } from "@/lib/korean-phrasebook/work-seed"
import { WORK_CAPTURE_COLLECTION, isWorkMessageCard } from "@/lib/korean-phrasebook/work"
import type {
  PhraseAnswerContent,
  PhraseAttempt,
  PhraseAttemptFeedback,
  PhraseCard,
  PhraseCardWithProgress,
  PhraseCollection,
  PhraseInputMethod,
  PhrasePracticeMode,
  PhraseProgress,
  PhraseQuestionContent,
  PhrasebookStats,
  PhraseVocabularyItem,
} from "@/lib/types"
import { aiPost } from "./ai-client"
import { isMissingSchemaError } from "./schema-errors"

// Supabase-backed Phrasebook service. Maps kori_phrase_* rows to the
// camelCase app types (lib/types.ts) and delegates all SRS/mastery/filter
// math to lib/korean-phrasebook (pure, unit tested) — this file's own job is
// query shape + row<->type mapping, matching the rest of lib/api/*.

// ── Row shapes ───────────────────────────────────────────────────────────────

type CollectionRow = {
  id: string
  user_id: string
  source_key: string | null
  title_ko: string
  title_en: string
  description: string | null
  category: string
  seed_version: number
  pinned: boolean
  created_at: string
  updated_at: string
}

type CardRow = {
  id: string
  user_id: string
  collection_id: string
  source_key: string | null
  category: string
  situation: string
  difficulty: PhraseCard["difficulty"]
  question: PhraseQuestionContent
  question_variants: string[]
  answers: PhraseAnswerContent[]
  usage_note: string | null
  vocabulary: PhraseVocabularyItem[]
  tags: string[]
  position: number
  active: boolean
  is_user_edited: boolean
  // Added by migration 20261106120000 — absent from rows until it's applied.
  work_context?: unknown
  provenance?: PhraseProvenance | null
  source_label?: string | null
  created_at: string
  updated_at: string
}

type ProgressRow = {
  user_id: string
  phrase_id: string
  state: PhraseProgress["state"]
  repetitions: number
  interval_days: number
  ease_factor: number
  lapses: number
  mastery: number
  attempt_count: number
  successful_count: number
  last_grade: ReviewRating | null
  last_reviewed_at: string | null
  next_review_at: string
  mastered: boolean
}

type AttemptRow = {
  id: string
  phrase_id: string
  practice_mode: PhrasePracticeMode
  input_method: PhraseInputMethod
  transcript: string | null
  feedback: PhraseAttemptFeedback | null
  hint_used: boolean
  transcript_revealed: boolean
  task_completed: boolean
  created_at: string
}

function toCollection(row: CollectionRow): PhraseCollection {
  return {
    id: row.id,
    userId: row.user_id,
    sourceKey: row.source_key,
    titleKo: row.title_ko,
    titleEn: row.title_en,
    description: row.description,
    category: row.category,
    seedVersion: row.seed_version,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Stored work_context is validated on read (it's jsonb); a seeded work card
// falls back to the pack's own notes, so the work practice works before the
// column exists and after a learner edits the card's text.
function resolveWorkContext(row: CardRow): WorkContext | null {
  if (row.work_context != null) {
    const parsed = workContextSchema.safeParse(row.work_context)
    if (parsed.success) return parsed.data
  }
  return (row.source_key && WORK_CONTEXT_BY_SOURCE_KEY.get(row.source_key)) || null
}

function toCard(row: CardRow): PhraseCard {
  return {
    id: row.id,
    userId: row.user_id,
    collectionId: row.collection_id,
    sourceKey: row.source_key,
    category: row.category,
    situation: row.situation,
    difficulty: row.difficulty,
    question: row.question,
    questionVariants: row.question_variants ?? [],
    answers: row.answers ?? [],
    usageNote: row.usage_note,
    vocabulary: row.vocabulary ?? [],
    tags: row.tags ?? [],
    position: row.position,
    active: row.active,
    isUserEdited: row.is_user_edited,
    workContext: resolveWorkContext(row),
    provenance: row.provenance ?? null,
    sourceLabel: row.source_label ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProgress(row: ProgressRow): PhraseProgress {
  return {
    phraseId: row.phrase_id,
    state: row.state,
    repetitions: row.repetitions,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    lapses: row.lapses,
    mastery: row.mastery,
    attemptCount: row.attempt_count,
    successfulCount: row.successful_count,
    lastGrade: row.last_grade,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    mastered: row.mastered,
  }
}

function toAttempt(row: AttemptRow): PhraseAttempt {
  return {
    id: row.id,
    phraseId: row.phrase_id,
    practiceMode: row.practice_mode,
    inputMethod: row.input_method,
    transcript: row.transcript,
    feedback: row.feedback,
    hintUsed: row.hint_used,
    transcriptRevealed: row.transcript_revealed,
    taskCompleted: row.task_completed,
    createdAt: row.created_at,
  }
}

function contentToCardRowFields(content: PhraseCardContentInput) {
  return {
    category: content.category,
    situation: content.situation,
    difficulty: content.difficulty,
    question: content.question,
    question_variants: content.questionVariants,
    answers: content.answers,
    usage_note: content.usageNote ?? null,
    vocabulary: content.vocabulary,
    tags: content.tags,
    // Optional metadata: undefined keys are dropped from the request body, so
    // the edit form (which doesn't know these fields) never clears them.
    work_context: content.workContext,
    provenance: content.provenance,
    source_label: content.sourceLabel,
  }
}

const WORK_COLUMNS = ["work_context", "provenance", "source_label"] as const

function withoutWorkColumns<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row }
  for (const column of WORK_COLUMNS) delete copy[column]
  return copy as T
}

// Inserts card rows; if the work-focus migration isn't applied yet (the new
// columns are unknown), retries once without them so seeding and saving keep
// working. Seeded cards still get their notes from the pack (resolveWorkContext).
async function insertCardRows(rows: Array<Record<string, unknown>>) {
  const first = await supabase.from("kori_phrase_cards").insert(rows).select("id")
  if (!first.error || !isMissingSchemaError(first.error)) return first
  return supabase.from("kori_phrase_cards").insert(rows.map(withoutWorkColumns)).select("id")
}

/** A one-paragraph English summary of a work context, used as the usage note
 *  when the work_context column isn't available yet. */
function workContextSummary(context: WorkContext): string {
  const parts = [`Main point: ${context.mainPoint}`]
  if (context.requiredAction) parts.push(`To do: ${context.requiredAction}`)
  if (context.conditions.length) parts.push(`Conditions: ${context.conditions.join("; ")}`)
  if (context.deadline) parts.push(`Deadline: ${context.deadline}`)
  if (context.unknowns.length) parts.push(`Unclear: ${context.unknowns.join("; ")}`)
  return parts.join(" · ")
}

async function attachProgress(cards: CardRow[]): Promise<PhraseCardWithProgress[]> {
  if (cards.length === 0) return []
  const { data: progressRows, error } = await supabase
    .from("kori_phrase_progress")
    .select("*")
    .in(
      "phrase_id",
      cards.map((c) => c.id),
    )
  if (error) throw error
  const byPhraseId = new Map(
    (progressRows as ProgressRow[]).map((p) => [p.phrase_id, toProgress(p)]),
  )
  return cards.map((row) => ({ ...toCard(row), progress: byPhraseId.get(row.id) ?? null }))
}

// ── Seeding ──────────────────────────────────────────────────────────────────

// getCollections/getAllCards both call this, and callers routinely fire them
// in the same Promise.all (e.g. the landing page) — without this guard, two
// concurrent calls on a brand-new account would both see "not seeded yet"
// and both try to insert the same seed pack, and the loser would hit the
// (user_id, source_key) unique constraint. Sharing one in-flight promise
// makes concurrent callers await the same seed run instead of racing it.
let inFlightSeed: Promise<void> | null = null

function ensureSeeded(): Promise<void> {
  if (!inFlightSeed) {
    inFlightSeed = runSeeding().finally(() => {
      inFlightSeed = null
    })
  }
  return inFlightSeed
}

async function runSeeding(): Promise<void> {
  const userId = requireUserId()
  const [{ data: collectionRows, error: collectionsError }, { data: cardRows, error: cardsError }] =
    await Promise.all([
      supabase.from("kori_phrase_collections").select("id, source_key, seed_version"),
      supabase
        .from("kori_phrase_cards")
        .select("id, source_key, is_user_edited, question, answers"),
    ])
  if (collectionsError) throw collectionsError
  if (cardsError) throw cardsError

  const existingCollections: ExistingSeedCollection[] = (collectionRows ?? []).map((r) => ({
    id: r.id,
    sourceKey: r.source_key,
    seedVersion: r.seed_version,
  }))
  const existingCards: ExistingSeedCard[] = (cardRows ?? []).map((r) => ({
    id: r.id,
    sourceKey: r.source_key,
    isUserEdited: r.is_user_edited,
    contentKey:
      r.question && Array.isArray(r.answers)
        ? seedContentKey({
            question: r.question as PhraseQuestionContent,
            answers: r.answers as PhraseAnswerContent[],
          })
        : undefined,
  }))

  const plan = planSeedUpsert(existingCollections, existingCards)

  for (const pack of plan.collectionsToInsert) {
    const { data: collection, error: insertError } = await supabase
      .from("kori_phrase_collections")
      .insert({
        user_id: userId,
        source_key: pack.sourceKey,
        title_ko: pack.titleKo,
        title_en: pack.titleEn,
        description: pack.description,
        category: pack.category,
        seed_version: pack.seedVersion,
      })
      .select("id")
      .single()
    if (insertError) throw insertError
    if (pack.cards.length > 0) {
      const { error: cardsInsertError } = await insertCardRows(
        pack.cards.map((card, index) => ({
          user_id: userId,
          collection_id: collection.id,
          source_key: card.sourceKey,
          position: index,
          ...contentToCardRowFields(card),
        })),
      )
      if (cardsInsertError) throw cardsInsertError
    }
  }

  for (const bump of plan.collectionsToBumpVersion) {
    await supabase
      .from("kori_phrase_collections")
      .update({ seed_version: bump.seedVersion })
      .eq("id", bump.id)
  }

  if (plan.cardsToInsert.length > 0) {
    const { error: cardsInsertError } = await insertCardRows(
      plan.cardsToInsert.map(({ collectionId, card }) => ({
        user_id: userId,
        collection_id: collectionId,
        source_key: card.sourceKey,
        ...contentToCardRowFields(card),
      })),
    )
    if (cardsInsertError) throw cardsInsertError
  }
}

async function ensureWorkCaptureCollection(userId: string): Promise<string> {
  const select = () =>
    supabase
      .from("kori_phrase_collections")
      .select("id")
      .eq("user_id", userId)
      .eq("source_key", WORK_CAPTURE_COLLECTION.sourceKey)
      .maybeSingle()
  const found = await select()
  if (found.error) throw found.error
  if (found.data) return found.data.id as string

  const inserted = await supabase
    .from("kori_phrase_collections")
    .insert({
      user_id: userId,
      source_key: WORK_CAPTURE_COLLECTION.sourceKey,
      title_ko: WORK_CAPTURE_COLLECTION.titleKo,
      title_en: WORK_CAPTURE_COLLECTION.titleEn,
      description: WORK_CAPTURE_COLLECTION.description,
      category: WORK_CAPTURE_COLLECTION.category,
    })
    .select("id")
    .single()
  if (!inserted.error) return inserted.data.id as string
  if (inserted.error.code === "23505") {
    const raced = await select()
    if (raced.data) return raced.data.id as string
  }
  throw inserted.error
}

export const phrasebookApi = {
  ensureSeeded,

  getCollections: async (): Promise<PhraseCollection[]> => {
    await ensureSeeded()
    const { data, error } = await supabase
      .from("kori_phrase_collections")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data as CollectionRow[]).map(toCollection)
  },

  getCollection: async (id: string): Promise<PhraseCollection> => {
    const { data, error } = await supabase
      .from("kori_phrase_collections")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return toCollection(data as CollectionRow)
  },

  createCollection: async (input: {
    titleKo: string
    titleEn: string
    description?: string
    category: string
  }) => {
    const parsed = phraseCollectionInputSchema.parse(input)
    const { data, error } = await supabase
      .from("kori_phrase_collections")
      .insert({
        user_id: requireUserId(),
        title_ko: parsed.titleKo,
        title_en: parsed.titleEn,
        description: parsed.description ?? null,
        category: parsed.category,
      })
      .select("*")
      .single()
    if (error) throw error
    return toCollection(data as CollectionRow)
  },

  setPinned: async (id: string, pinned: boolean) => {
    const { error } = await supabase.from("kori_phrase_collections").update({ pinned }).eq("id", id)
    if (error) throw error
  },

  deleteCollection: async (id: string) => {
    const { error } = await supabase.from("kori_phrase_collections").delete().eq("id", id)
    if (error) throw error
  },

  getCardsForCollection: async (collectionId: string): Promise<PhraseCardWithProgress[]> => {
    const { data, error } = await supabase
      .from("kori_phrase_cards")
      .select("*")
      .eq("collection_id", collectionId)
      .eq("active", true)
      .order("position", { ascending: true })
    if (error) throw error
    return attachProgress(data as CardRow[])
  },

  getAllCards: async (): Promise<PhraseCardWithProgress[]> => {
    await ensureSeeded()
    const { data, error } = await supabase.from("kori_phrase_cards").select("*").eq("active", true)
    if (error) throw error
    return attachProgress(data as CardRow[])
  },

  getCard: async (id: string): Promise<PhraseCardWithProgress> => {
    const { data, error } = await supabase
      .from("kori_phrase_cards")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    const [withProgress] = await attachProgress([data as CardRow])
    return withProgress
  },

  createCard: async (collectionId: string, content: unknown): Promise<PhraseCard> => {
    const parsed = phraseCardContentSchema.parse(content)
    const { data, error } = await supabase
      .from("kori_phrase_cards")
      .insert({
        user_id: requireUserId(),
        collection_id: collectionId,
        is_user_edited: true, // hand-created — never a seeding candidate
        ...contentToCardRowFields(parsed),
      })
      .select("*")
      .single()
    if (error) throw error
    return toCard(data as CardRow)
  },

  updateCard: async (id: string, content: unknown): Promise<PhraseCard> => {
    const parsed = phraseCardContentSchema.parse(content)
    const { data, error } = await supabase
      .from("kori_phrase_cards")
      .update({ ...contentToCardRowFields(parsed), is_user_edited: true })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return toCard(data as CardRow)
  },

  setActive: async (id: string, active: boolean) => {
    const { error } = await supabase.from("kori_phrase_cards").update({ active }).eq("id", id)
    if (error) throw error
  },

  deleteCard: async (id: string) => {
    const { error } = await supabase.from("kori_phrase_cards").delete().eq("id", id)
    if (error) throw error
  },

  moveCard: async (id: string, collectionId: string) => {
    const { error } = await supabase
      .from("kori_phrase_cards")
      .update({ collection_id: collectionId })
      .eq("id", id)
    if (error) throw error
  },

  // Practice-runner queue (review/listen/speak modes) — due cards first, then
  // recently-failed, then the caller's preferred category, new cards last.
  getPracticeQueue: async (
    options: { collectionId?: string } & Omit<PhraseSelectionOptions, "recentlyFailedIds"> & {
        recentlyFailedIds?: string[]
      },
  ): Promise<PhraseCardWithProgress[]> => {
    const cards = options.collectionId
      ? await phrasebookApi.getCardsForCollection(options.collectionId)
      : await phrasebookApi.getAllCards()
    return selectPracticeQueue(cards, {
      ...options,
      recentlyFailedIds: options.recentlyFailedIds ? new Set(options.recentlyFailedIds) : undefined,
    })
  },

  // Distinct phrases behind the most recent attempts, newest first — powers
  // the Phrasebook landing page's "Recently practiced" row.
  getRecentlyPracticed: async (limit = 5): Promise<PhraseCardWithProgress[]> => {
    const { data, error } = await supabase
      .from("kori_phrase_attempts")
      .select("phrase_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error
    const orderedIds: string[] = []
    const seen = new Set<string>()
    for (const row of (data ?? []) as Array<{ phrase_id: string }>) {
      if (seen.has(row.phrase_id)) continue
      seen.add(row.phrase_id)
      orderedIds.push(row.phrase_id)
      if (orderedIds.length >= limit) break
    }
    if (orderedIds.length === 0) return []
    const { data: cardRows, error: cardsError } = await supabase
      .from("kori_phrase_cards")
      .select("*")
      .in("id", orderedIds)
    if (cardsError) throw cardsError
    const withProgress = await attachProgress(cardRows as CardRow[])
    const byId = new Map(withProgress.map((c) => [c.id, c]))
    return orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is PhraseCardWithProgress => Boolean(c))
  },

  // Cards due for review right now — used both for the landing page's due
  // count and to build Today's Mission's phrase_review candidate.
  getDuePhrases: async (): Promise<PhraseCardWithProgress[]> => {
    const cards = await phrasebookApi.getAllCards()
    return cards.filter((c) => c.progress && isCardDue(c.progress.nextReviewAt))
  },

  // ── Korean for my work ────────────────────────────────────────────────────

  // Cards the work-reply practice can use (curated comprehension cards and
  // saved work messages), newest-practiced last so fresh ones come first.
  getWorkMessageCards: async (): Promise<PhraseCardWithProgress[]> => {
    const cards = await phrasebookApi.getAllCards()
    return cards
      .filter(isWorkMessageCard)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  },

  /**
   * Saves a reviewed work-message draft as a Phrasebook card in the owner's
   * "My work messages" collection. Idempotent end to end:
   * - the collection is found by its source_key, or created — a concurrent
   *   create loses on the (user_id, source_key) unique index and re-reads;
   * - the card's source_key is captureSourceKey(message, reply), so a double
   *   click, a retry after a timeout or saving the same analysis twice hits
   *   the same unique index and returns the existing card (created: false).
   * One card row holds the reply and its 3–5 vocabulary entries, so there is
   * no multi-row write to leave half-done. Ownership: user_id comes from the
   * session (never the caller), RLS checks it, and the existing
   * kori_phrase_check_card_ownership trigger rejects a collection_id that
   * belongs to someone else.
   */
  saveWorkCapture: async (
    content: PhraseCardContentInput,
    sourceKey: string,
  ): Promise<{ card: PhraseCard; created: boolean }> => {
    const userId = requireUserId()
    const parsed = phraseCardContentSchema.parse(content)
    if (!sourceKey.startsWith("capture-")) throw new Error("Invalid capture key")

    const findCard = async () => {
      const { data, error } = await supabase
        .from("kori_phrase_cards")
        .select("*")
        .eq("user_id", userId)
        .eq("source_key", sourceKey)
        .maybeSingle()
      if (error) throw error
      return data ? toCard(data as CardRow) : null
    }

    const existing = await findCard()
    if (existing) return { card: existing, created: false }

    const collectionId = await ensureWorkCaptureCollection(userId)
    const row = {
      user_id: userId,
      collection_id: collectionId,
      source_key: sourceKey,
      is_user_edited: true, // the owner's own content — never a seeding candidate
      ...contentToCardRowFields(parsed),
    }
    let result = await supabase.from("kori_phrase_cards").insert(row).select("*").single()
    if (result.error && isMissingSchemaError(result.error)) {
      // Before the work-focus migration: keep the notes readable in the usage
      // note rather than dropping them.
      const fallback = withoutWorkColumns(row)
      const note = parsed.workContext ? workContextSummary(parsed.workContext) : ""
      fallback.usage_note =
        [parsed.usageNote, note].filter(Boolean).join("\n").slice(0, 1000) || null
      result = await supabase.from("kori_phrase_cards").insert(fallback).select("*").single()
    }
    if (result.error) {
      if (result.error.code === "23505") {
        const raced = await findCard()
        if (raced) return { card: raced, created: false }
      }
      throw result.error
    }
    return { card: toCard(result.data as CardRow), created: true }
  },

  // ── SRS review grading ────────────────────────────────────────────────────

  rate: async (phraseId: string, rating: ReviewRating): Promise<PhraseProgress> => {
    const userId = requireUserId()
    const { data: existingRow } = await supabase
      .from("kori_phrase_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("phrase_id", phraseId)
      .maybeSingle()

    const current = existingRow as ProgressRow | null
    const result = rateProgress(
      {
        easeFactor: current?.ease_factor ?? 2.5,
        intervalDays: current?.interval_days ?? 0,
        repetitions: current?.repetitions ?? 0,
        lapses: current?.lapses ?? 0,
        mastery: current?.mastery ?? 0,
      },
      rating,
    )
    const attemptCount = (current?.attempt_count ?? 0) + 1
    const successfulCount = (current?.successful_count ?? 0) + (rating === "AGAIN" ? 0 : 1)
    const state = deriveState(result.mastery, attemptCount)

    const row = {
      user_id: userId,
      phrase_id: phraseId,
      state,
      repetitions: result.repetitions,
      interval_days: result.intervalDays,
      ease_factor: result.easeFactor,
      lapses: result.lapses,
      mastery: result.mastery,
      attempt_count: attemptCount,
      successful_count: successfulCount,
      last_grade: rating,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: result.nextReview,
      mastered: state === "mastered",
    }
    const { data, error } = await supabase
      .from("kori_phrase_progress")
      .upsert(row, { onConflict: "user_id,phrase_id" })
      .select("*")
      .single()
    if (error) throw error
    return toProgress(data as ProgressRow)
  },

  // ── Practice attempts (listening / speaking) ──────────────────────────────

  recordAttempt: async (input: {
    phraseId: string
    practiceMode: PhrasePracticeMode
    inputMethod: PhraseInputMethod
    transcript?: string
    feedback?: PhraseAttemptFeedback
    hintUsed?: boolean
    transcriptRevealed?: boolean
    taskCompleted: boolean
  }): Promise<PhraseAttempt> => {
    const { data, error } = await supabase
      .from("kori_phrase_attempts")
      .insert({
        user_id: requireUserId(),
        phrase_id: input.phraseId,
        practice_mode: input.practiceMode,
        input_method: input.inputMethod,
        transcript: input.transcript ?? null,
        feedback: input.feedback ?? null,
        hint_used: input.hintUsed ?? false,
        transcript_revealed: input.transcriptRevealed ?? false,
        task_completed: input.taskCompleted,
      })
      .select("*")
      .single()
    if (error) throw error
    return toAttempt(data as AttemptRow)
  },

  // Calls the server-side evaluation route (which re-fetches the phrase card
  // by id — the client only ever sends the transcript, never the expected
  // answer) and, for a meaningful mistake, saves it into the shared
  // correction notebook the same way correctionApi.check does — fingerprint-
  // deduped, tagged so it's traceable back to Phrasebook practice.
  //
  // `options` is used by the work-reply practice: a typed answer (so the
  // grader never talks about speech) and the learner's intended meaning (so
  // meaning and tense are checked before style).
  evaluateSpeaking: async (
    phraseId: string,
    transcript: string,
    options: { intendedMeaning?: string; inputMethod?: "voice" | "text" } = {},
  ) => {
    const result = await aiPost<{
      communicationSuccess: boolean
      correctedSentence: string
      naturalAlternative: string
      explanation: string
      vocabulary: PhraseVocabularyItem[]
      retryWords: string[]
      mistakeSeverity: "none" | "minor" | "important"
      meaningPreserved?: boolean | null
      pattern?: string | null
    }>("/phrasebook/evaluate", {
      phraseId,
      transcript,
      ...(options.intendedMeaning?.trim()
        ? { intendedMeaning: options.intendedMeaning.trim() }
        : {}),
      ...(options.inputMethod ? { inputMethod: options.inputMethod } : {}),
    })

    if (
      result.mistakeSeverity !== "none" &&
      result.correctedSentence &&
      result.correctedSentence !== transcript
    ) {
      try {
        const userId = requireUserId()
        const fingerprint = createCorrectionFingerprint({
          originalText: transcript,
          correctedText: result.correctedSentence,
          category: "expression",
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
        const plan = planCorrectionUpsert(existing, { severity: result.mistakeSeverity })
        const row = {
          user_id: userId,
          original_text: transcript,
          corrected_text: result.correctedSentence,
          explanation: result.explanation || null,
          grammar_points: [] as string[],
          mastery: plan.state.mastery,
          next_review_date: plan.state.nextReviewDate,
          ease_factor: plan.state.easeFactor,
          interval_days: plan.state.intervalDays,
          repetitions: plan.state.repetitions,
          lapses: plan.state.lapses,
          source_feature: "phrasebook_speaking",
          source_id: phraseId,
          error_category: "expression",
          severity: result.mistakeSeverity,
          natural_version: result.naturalAlternative || null,
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
      } catch {
        // Best-effort — a failed correction save must not break the practice flow.
      }
    }

    return result
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  getStats: async (): Promise<PhrasebookStats> => {
    const userId = requireUserId()
    const [
      { data: progressRows, error: progressError },
      { data: attemptRows, error: attemptError },
      { data: cardRows, error: cardError },
    ] = await Promise.all([
      supabase.from("kori_phrase_progress").select("state, next_review_at").eq("user_id", userId),
      supabase
        .from("kori_phrase_attempts")
        .select("practice_mode, phrase_id, feedback")
        .eq("user_id", userId),
      supabase.from("kori_phrase_cards").select("id, category, situation").eq("active", true),
    ])
    if (progressError) throw progressError
    if (attemptError) throw attemptError
    if (cardError) throw cardError

    const progress = (progressRows ?? []) as Array<{
      state: PhraseProgress["state"]
      next_review_at: string
    }>
    const cardsLearned = progress.filter((p) => p.state !== "new").length
    const cardsMastered = progress.filter((p) => p.state === "mastered").length
    const now = new Date().toISOString()
    const cardsDue = progress.filter((p) => p.next_review_at <= now).length

    const attempts = (attemptRows ?? []) as Array<{
      practice_mode: PhrasePracticeMode
      phrase_id: string
      feedback: PhraseAttemptFeedback | null
    }>
    const cardById = new Map(
      (cardRows as Array<{ id: string; category: string; situation: string }>).map((c) => [
        c.id,
        c,
      ]),
    )

    const listeningAttempts = attempts.filter((a) => a.practice_mode === "listen").length
    const speakingAttempts = attempts.filter((a) => a.practice_mode === "speak")
    const successfulSpeaking = speakingAttempts.filter(
      (a) => a.feedback?.communicationSuccess === true,
    ).length
    const successfulCommunicationRate =
      speakingAttempts.length > 0
        ? Math.round((successfulSpeaking / speakingAttempts.length) * 100)
        : 0

    const failuresBySituation = new Map<string, number>()
    for (const attempt of speakingAttempts) {
      if (attempt.feedback?.communicationSuccess !== false) continue
      const situation = cardById.get(attempt.phrase_id)?.situation
      if (!situation) continue
      failuresBySituation.set(situation, (failuresBySituation.get(situation) ?? 0) + 1)
    }
    const mostDifficultSituations = [...failuresBySituation.entries()]
      .map(([situation, failureCount]) => ({ situation, failureCount }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5)

    let workplaceActivityCount = 0
    let dailyActivityCount = 0
    for (const attempt of attempts) {
      const category = cardById.get(attempt.phrase_id)?.category
      if (category === "workplace") workplaceActivityCount += 1
      else if (category === "daily") dailyActivityCount += 1
    }

    return {
      cardsLearned,
      cardsDue,
      cardsMastered,
      listeningAttempts,
      speakingAttempts: speakingAttempts.length,
      successfulCommunicationRate,
      mostDifficultSituations,
      workplaceActivityCount,
      dailyActivityCount,
    }
  },
}
