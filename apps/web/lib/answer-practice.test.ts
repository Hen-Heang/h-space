import { describe, expect, it } from "vitest"

import {
  ANSWER_PRACTICE_PRESETS,
  answerPracticeReducer,
  canReplay,
  canSubmitAnswer,
  initialAnswerPracticeState,
  type AnswerPracticeEvent,
  type AnswerPracticeState,
} from "./answer-practice"

const speaking = ANSWER_PRACTICE_PRESETS.speaking
const listening = ANSWER_PRACTICE_PRESETS.listening

function run(
  events: AnswerPracticeEvent[],
  preset = speaking,
  from: AnswerPracticeState = initialAnswerPracticeState(),
) {
  return events.reduce((state, event) => answerPracticeReducer(state, event, preset), from)
}

describe("answerPracticeReducer", () => {
  it("runs listen → answer → check → review", () => {
    const state = run([{ type: "audio-ended" }, { type: "submit" }, { type: "check-succeeded" }])
    expect(state).toEqual({
      phase: "review",
      attempts: 1,
      review: "checked",
      textRevealed: true,
      error: null,
    })
  })

  it("lets the learner answer without waiting for the audio", () => {
    expect(run([{ type: "skip-listen" }]).phase).toBe("answer")
  })

  it("retries after review and counts the second attempt", () => {
    const state = run([
      { type: "audio-ended" },
      { type: "submit" },
      { type: "check-succeeded" },
      { type: "retry" },
    ])
    expect(state.phase).toBe("retry")
    const after = run([{ type: "submit" }, { type: "check-succeeded" }], speaking, state)
    expect(after.phase).toBe("review")
    expect(after.attempts).toBe(2)
  })

  it("returns to the right answering phase when a check fails", () => {
    const first = run([{ type: "audio-ended" }, { type: "submit" }])
    const failed = answerPracticeReducer(first, { type: "check-failed", message: "Offline" })
    expect(failed.phase).toBe("answer")
    expect(failed.error).toBe("Offline")

    const retrying = run(
      [{ type: "submit" }, { type: "check-succeeded" }, { type: "retry" }, { type: "submit" }],
      speaking,
      failed,
    )
    const failedRetry = answerPracticeReducer(retrying, { type: "check-failed", message: "x" })
    expect(failedRetry.phase).toBe("retry")
    expect(failedRetry.attempts).toBe(1)
  })

  it("clears a check error on the next submit", () => {
    const failed = run([
      { type: "audio-ended" },
      { type: "submit" },
      { type: "check-failed", message: "Offline" },
      { type: "submit" },
    ])
    expect(failed.error).toBeNull()
  })

  it("compares without a check and reveals the text", () => {
    const state = run([{ type: "audio-ended" }, { type: "compare" }], listening)
    expect(state.review).toBe("compared")
    expect(state.textRevealed).toBe(true)
    expect(state.attempts).toBe(1)
  })

  it("ignores events that don't apply", () => {
    const listen = initialAnswerPracticeState()
    expect(answerPracticeReducer(listen, { type: "submit" })).toBe(listen)
    expect(answerPracticeReducer(listen, { type: "retry" })).toBe(listen)
    expect(answerPracticeReducer(listen, { type: "check-succeeded" })).toBe(listen)

    const checking = run([{ type: "audio-ended" }, { type: "submit" }])
    expect(answerPracticeReducer(checking, { type: "submit" })).toBe(checking)
    expect(answerPracticeReducer(checking, { type: "compare" })).toBe(checking)
    expect(answerPracticeReducer(checking, { type: "audio-ended" })).toBe(checking)
  })

  describe("revealing the question text", () => {
    it("is allowed early in the speaking preset", () => {
      expect(run([{ type: "reveal-text" }], speaking).textRevealed).toBe(true)
    })

    it("waits for the answer in the listening preset", () => {
      const early = run([{ type: "audio-ended" }, { type: "reveal-text" }], listening)
      expect(early.textRevealed).toBe(false)
    })
  })
})

describe("canSubmitAnswer", () => {
  it("needs an answering phase and some text", () => {
    const answering = run([{ type: "audio-ended" }])
    expect(canSubmitAnswer(answering, "저는 걸어서 출근합니다")).toBe(true)
    expect(canSubmitAnswer(answering, "   ")).toBe(false)
    expect(canSubmitAnswer(initialAnswerPracticeState(), "답")).toBe(false)
  })
})

describe("canReplay", () => {
  it("respects the listening level's play limit", () => {
    expect(canReplay(5, null)).toBe(true)
    expect(canReplay(0, 1)).toBe(true)
    expect(canReplay(1, 1)).toBe(false)
  })
})

describe("ANSWER_PRACTICE_PRESETS", () => {
  it("uses session types the answers table already accepts", () => {
    expect(speaking.sessionType).toBe("speaking_drill")
    expect(listening.sessionType).toBe("listening_drill")
  })
})
