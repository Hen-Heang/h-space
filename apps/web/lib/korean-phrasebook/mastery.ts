import { applyRating, isDue, type ReviewRating, type SrsCardState, type SrsResult } from "@/lib/srs"
import { categoryLabel, situationLabel } from "./labels"
import type { PhraseCardWithProgress, PhraseState } from "@/lib/types"

// Pure Phrasebook domain logic — no React, no Supabase. Mirrors the
// established pattern (lib/vocab-review.ts, lib/recovery.ts): thresholds and
// SRS math live here and are unit tested directly; lib/api/phrasebook.ts
// only maps rows in and out of Supabase.

// Same bands as lib/vocab-review.ts's MasteryFilter so "learning"/"mastered"
// mean the same thing across every SRS-backed feature in the app.
export function deriveState(mastery: number, attemptCount: number): PhraseState {
  if (attemptCount === 0) return "new"
  if (mastery >= 80) return "mastered"
  return "learning"
}

/** Grades a phrase card's progress the same way vocab/corrections do. */
export function rateProgress(progress: SrsCardState, rating: ReviewRating): SrsResult {
  return applyRating(progress, rating)
}

export function isCardDue(nextReviewAt: string, now: Date = new Date()): boolean {
  return isDue(nextReviewAt, now)
}

export function isCardOverdue(nextReviewAt: string, now: Date = new Date()): boolean {
  const days = (now.getTime() - new Date(nextReviewAt).getTime()) / 86_400_000
  return days > 1
}

export interface PhrasebookCounts {
  due: number
  overdue: number
  new: number
  learning: number
  mastered: number
  total: number
}

export function countPhraseStates(
  cards: PhraseCardWithProgress[],
  now: Date = new Date(),
): PhrasebookCounts {
  const counts: PhrasebookCounts = {
    due: 0,
    overdue: 0,
    new: 0,
    learning: 0,
    mastered: 0,
    total: cards.length,
  }
  for (const card of cards) {
    const progress = card.progress
    if (!progress || progress.state === "new") {
      counts.new += 1
      continue
    }
    if (progress.state === "learning") counts.learning += 1
    if (progress.state === "mastered") counts.mastered += 1
    if (isCardDue(progress.nextReviewAt, now)) {
      counts.due += 1
      if (isCardOverdue(progress.nextReviewAt, now)) counts.overdue += 1
    }
  }
  return counts
}

// ── Filtering / search ──────────────────────────────────────────────────────

export interface PhraseFilters {
  query?: string
  category?: string
  situation?: string
  difficulty?: string
  dueOnly?: boolean
}

function matchesQuery(card: PhraseCardWithProgress, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    card.question.korean,
    card.question.english,
    card.question.romanization,
    card.situation,
    situationLabel(card.situation),
    card.category,
    categoryLabel(card.category),
    ...card.questionVariants,
    ...card.answers.map((a) => a.korean),
    ...card.answers.map((a) => a.english),
    ...card.tags,
    ...card.vocabulary.map((v) => v.korean),
    ...card.vocabulary.map((v) => v.english),
  ]
  return haystack.some((field) => field.toLowerCase().includes(q))
}

export function filterPhraseCards(
  cards: PhraseCardWithProgress[],
  filters: PhraseFilters,
  now: Date = new Date(),
): PhraseCardWithProgress[] {
  return cards.filter((card) => {
    if (filters.category && card.category !== filters.category) return false
    if (filters.situation && card.situation !== filters.situation) return false
    if (filters.difficulty && card.difficulty !== filters.difficulty) return false
    if (filters.dueOnly && !(card.progress && isCardDue(card.progress.nextReviewAt, now)))
      return false
    if (filters.query && !matchesQuery(card, filters.query)) return false
    return true
  })
}

// ── Mission / practice-queue selection ──────────────────────────────────────
// Priority per the product spec: due cards > recently-failed cards > cards
// matching the user's stated goal category > new cards, only filling with new
// cards once the due/weak queue is small. Deterministic (stable sort by id)
// so the same inputs always produce the same queue — same discipline as
// lib/learning/mission-engine.ts's buildDailyMission.
export interface PhraseSelectionOptions {
  limit: number
  preferredCategory?: string | null
  recentlyFailedIds?: Set<string>
  now?: Date
}

export function selectPracticeQueue(
  cards: PhraseCardWithProgress[],
  options: PhraseSelectionOptions,
): PhraseCardWithProgress[] {
  const now = options.now ?? new Date()
  const failed = options.recentlyFailedIds ?? new Set<string>()

  function weight(card: PhraseCardWithProgress): number {
    let w = 0
    if (card.progress && isCardDue(card.progress.nextReviewAt, now)) {
      w += isCardOverdue(card.progress.nextReviewAt, now) ? 100 : 80
    }
    if (failed.has(card.id)) w += 40
    if (options.preferredCategory && card.category === options.preferredCategory) w += 10
    if (!card.progress || card.progress.state === "new") w += 1 // lowest priority, still eligible
    return w
  }

  return [...cards]
    .filter((c) => c.active)
    .sort((a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id))
    .slice(0, options.limit)
}
