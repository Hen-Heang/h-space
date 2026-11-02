// One question in the unified Exam Prep answer practice:
//
//   listen ──audio-ended / skip-listen──▶ answer ──submit──▶ checking ──ok──▶ review
//                                           │                    │ fail        │
//                                           │                    ▼             │ retry
//                                           │                 (back to         ▼
//                                           └──compare──▶ review  answer)    retry ──submit──▶ checking …
//
// A compared review can still be checked ("submit" from review), so a
// listening learner can ask for AI feedback on the answer they just compared.
//
// "check" asks the AI to grade the transcript (costs a call, syncs progress);
// "compare" just reveals the question for self-review (free, nothing graded).
// Pure and framework-free; the session component owns side effects.

import type { SpeakingCheckResponse } from "@/lib/api/interview"
import type { VocabEntry } from "@/lib/interview"
import {
  mostDifficultQuestions,
  selectFocusQueue,
  wasPracticedToday,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"

export type AnswerPracticePreset = "speaking" | "listening"

export interface AnswerPracticePresetConfig {
  /** Can the Korean text be revealed before answering? */
  allowEarlyReveal: boolean
  /** The review the primary button runs. */
  primaryReview: "check" | "compare"
  /** `kori_interview_answers.session_type` for checked answers. */
  sessionType: "speaking_drill" | "listening_drill"
  /** Open the mic automatically when the question audio finishes. */
  autoListen: boolean
}

export const ANSWER_PRACTICE_PRESETS: Record<AnswerPracticePreset, AnswerPracticePresetConfig> = {
  // Today's 5 and the question bank: listen first, read if stuck, get checked.
  speaking: {
    allowEarlyReveal: true,
    primaryReview: "check",
    sessionType: "speaking_drill",
    autoListen: false,
  },
  // Comprehension training: the text exists only as audio until you've answered.
  listening: {
    allowEarlyReveal: false,
    primaryReview: "compare",
    sessionType: "listening_drill",
    autoListen: true,
  },
}

export type AnswerPracticePhase = "listen" | "answer" | "checking" | "review" | "retry"

export interface AnswerPracticeState {
  phase: AnswerPracticePhase
  /** Completed reviews for this question (checked or compared). */
  attempts: number
  /** How the latest review was made. */
  review: "checked" | "compared" | null
  /** Korean question text is visible. */
  textRevealed: boolean
  /** Last check failure, cleared on the next action. The answer is kept by the caller. */
  error: string | null
}

export type AnswerPracticeEvent =
  | { type: "audio-ended" }
  | { type: "skip-listen" }
  | { type: "reveal-text" }
  | { type: "submit" }
  | { type: "check-succeeded" }
  | { type: "check-failed"; message: string }
  | { type: "compare" }
  | { type: "retry" }

export function initialAnswerPracticeState(): AnswerPracticeState {
  return { phase: "listen", attempts: 0, review: null, textRevealed: false, error: null }
}

function answeringPhase(state: AnswerPracticeState): "answer" | "retry" {
  return state.attempts > 0 ? "retry" : "answer"
}

function isAnswering(phase: AnswerPracticePhase): boolean {
  return phase === "answer" || phase === "retry"
}

/**
 * Next state for an event; returns the same object when the event doesn't
 * apply, so callers can ignore stray clicks (double submit, late audio end).
 * Moving to the next question is a fresh `initialAnswerPracticeState()`.
 */
export function answerPracticeReducer(
  state: AnswerPracticeState,
  event: AnswerPracticeEvent,
  preset: AnswerPracticePresetConfig = ANSWER_PRACTICE_PRESETS.speaking,
): AnswerPracticeState {
  switch (event.type) {
    case "audio-ended":
    case "skip-listen":
      return state.phase === "listen" ? { ...state, phase: "answer" } : state

    case "reveal-text":
      if (state.textRevealed || !preset.allowEarlyReveal) return state
      return { ...state, textRevealed: true }

    case "submit":
      return isAnswering(state.phase) || (state.phase === "review" && state.review === "compared")
        ? { ...state, phase: "checking", error: null }
        : state

    case "check-succeeded":
      if (state.phase !== "checking") return state
      return {
        phase: "review",
        attempts: state.attempts + 1,
        review: "checked",
        textRevealed: true,
        error: null,
      }

    case "check-failed":
      if (state.phase !== "checking") return state
      return { ...state, phase: answeringPhase(state), error: event.message }

    case "compare":
      if (!isAnswering(state.phase)) return state
      return {
        phase: "review",
        attempts: state.attempts + 1,
        review: "compared",
        textRevealed: true,
        error: null,
      }

    case "retry":
      return state.phase === "review" ? { ...state, phase: "retry", error: null } : state
  }
}

/** Submit/compare need a non-empty answer and an answering phase. */
export function canSubmitAnswer(state: AnswerPracticeState, answer: string): boolean {
  return isAnswering(state.phase) && answer.trim().length > 0
}

/** Play limit for listening levels; `null` means unlimited. */
export function canReplay(playsUsed: number, maxPlays: number | null): boolean {
  return maxPlays === null || playsUsed < maxPlays
}

// ── Session ────────────────────────────────────────────────────────────────

/** Where a practice set's questions come from. */
export type PracticeSource = "today" | "weak" | "selected" | "ai"

export const PRACTICE_SOURCE_LABELS: Record<PracticeSource, string> = {
  today: "Today's 5",
  weak: "Weak questions",
  selected: "Chosen questions",
  ai: "AI questions",
}

/**
 * One question as the session uses it. Bank questions carry their id (so
 * checked answers update progress) and model answer; AI listening questions
 * carry word notes and a grammar note instead.
 */
export interface PracticeQuestion {
  id?: string
  ko: string
  en: string
  sampleAnswerKo?: string | null
  sampleAnswerEn?: string | null
  glosses?: VocabEntry[]
  grammarNote?: string
}

export function fromBankItem(question: QuestionBankItem): PracticeQuestion {
  return {
    id: question.id,
    ko: question.questionKo,
    en: question.questionEn ?? "",
    sampleAnswerKo: question.sampleAnswerKo,
    sampleAnswerEn: question.sampleAnswerEn,
  }
}

/** Drops repeats (by id, else by Korean text) and caps the set size. */
export function uniquePracticeQueue(queue: PracticeQuestion[], size: number): PracticeQuestion[] {
  const seen = new Set<string>()
  return queue
    .filter((question) => {
      const key = question.id ?? question.ko
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, Math.max(0, size))
}

/**
 * Practiced questions that aren't strong yet, most urgent first; falls back to
 * the hardest questions overall. Empty until something has been practiced.
 */
export function selectWeakQueue(
  questions: QuestionBankItem[],
  progress: Record<string, QuestionProgress>,
  size: number,
): QuestionBankItem[] {
  const weakPool = questions.filter((question) => {
    const item = progress[question.id]
    return item && item.timesPracticed > 0 && item.status !== "strong"
  })
  const focused = selectFocusQueue(weakPool, progress, size)
  return focused.length > 0 ? focused : mostDifficultQuestions(questions, progress, size)
}

/** Index of the first question not practiced today; 0 when all are done. */
export function firstOpenIndex(
  queue: PracticeQuestion[],
  progress: Record<string, QuestionProgress>,
  now: Date = new Date(),
): number {
  const index = queue.findIndex(
    (question) => !question.id || !wasPracticedToday(progress[question.id], now),
  )
  return index === -1 ? 0 : index
}

export interface PracticeAttempt {
  answer: string
  review: "checked" | "compared"
  /** Present for checked attempts. */
  result?: SpeakingCheckResponse
}

export interface PracticeRun {
  question: PracticeQuestion
  attempts: PracticeAttempt[]
}

/** Appends an attempt to the run for `question`, creating the run if needed. */
export function recordAttempt(
  runs: PracticeRun[],
  question: PracticeQuestion,
  attempt: PracticeAttempt,
): PracticeRun[] {
  const key = question.id ?? question.ko
  const existing = runs.find((run) => (run.question.id ?? run.question.ko) === key)
  if (!existing) return [...runs, { question, attempts: [attempt] }]
  return runs.map((run) =>
    run === existing ? { ...run, attempts: [...run.attempts, attempt] } : run,
  )
}

/** The checked attempts of a run, in order. */
export function checkedAttempts(run: PracticeRun): PracticeAttempt[] {
  return run.attempts.filter((attempt) => attempt.review === "checked" && attempt.result)
}
