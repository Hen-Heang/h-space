// One question in the unified Exam Prep answer practice:
//
//   listen ──audio-ended / skip-listen──▶ answer ──submit──▶ checking ──ok──▶ review
//                                           │                    │ fail        │
//                                           │                    ▼             │ retry
//                                           │                 (back to         ▼
//                                           └──compare──▶ review  answer)    retry ──submit──▶ checking …
//
// "check" asks the AI to grade the transcript (costs a call, syncs progress);
// "compare" just reveals the question for self-review (free, nothing graded).
// Pure and framework-free; the session component owns side effects.

export type AnswerPracticePreset = "speaking" | "listening"

export interface AnswerPracticePresetConfig {
  /** Can the Korean text be revealed before answering? */
  allowEarlyReveal: boolean
  /** The review the primary button runs. */
  primaryReview: "check" | "compare"
  /** `kori_interview_answers.session_type` for checked answers. */
  sessionType: "speaking_drill" | "listening_drill"
}

export const ANSWER_PRACTICE_PRESETS: Record<AnswerPracticePreset, AnswerPracticePresetConfig> = {
  // Today's 5 and the question bank: listen first, read if stuck, get checked.
  speaking: { allowEarlyReveal: true, primaryReview: "check", sessionType: "speaking_drill" },
  // Comprehension training: the text exists only as audio until you've answered.
  listening: { allowEarlyReveal: false, primaryReview: "compare", sessionType: "listening_drill" },
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
      return isAnswering(state.phase) ? { ...state, phase: "checking", error: null } : state

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
