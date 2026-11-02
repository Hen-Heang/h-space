import { describe, expect, it } from "vitest"

import {
  ANSWER_PRACTICE_PRESETS,
  answerPracticeReducer,
  canReplay,
  canSubmitAnswer,
  checkedAttempts,
  firstOpenIndex,
  fromBankItem,
  initialAnswerPracticeState,
  recordAttempt,
  selectWeakQueue,
  uniquePracticeQueue,
  type AnswerPracticeEvent,
  type AnswerPracticeState,
  type PracticeQuestion,
} from "./answer-practice"
import type { QuestionBankItem, QuestionProgress } from "./interview-practice"

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

  it("can still check an answer after comparing it", () => {
    const compared = run([{ type: "audio-ended" }, { type: "compare" }], listening)
    const checking = answerPracticeReducer(compared, { type: "submit" }, listening)
    expect(checking.phase).toBe("checking")
    const checked = answerPracticeReducer(checking, { type: "check-succeeded" }, listening)
    expect(checked).toMatchObject({ phase: "review", review: "checked", attempts: 2 })
    // A checked review can't be checked again without a new answer.
    expect(answerPracticeReducer(checked, { type: "submit" }, listening)).toBe(checked)
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

// ── Session helpers ────────────────────────────────────────────────────────

function bankItem(id: string, overrides: Partial<QuestionBankItem> = {}): QuestionBankItem {
  return {
    id,
    questionKo: `질문 ${id}`,
    questionEn: `Question ${id}`,
    sampleAnswerKo: `답변 ${id}`,
    sampleAnswerEn: null,
    category: "korean_summer",
    difficulty: "normal",
    priority: "recommended",
    keywords: [],
    displayOrder: 0,
    ownedByUser: false,
    ...overrides,
  }
}

function progressRow(id: string, overrides: Partial<QuestionProgress> = {}): QuestionProgress {
  return {
    questionId: id,
    timesPracticed: 1,
    avgScore: 2.5,
    lastScore: 2.5,
    lastPracticedAt: "2026-11-01T10:00:00Z",
    status: "practicing",
    ...overrides,
  }
}

describe("fromBankItem", () => {
  it("keeps the id and model answer so checks update progress", () => {
    expect(fromBankItem(bankItem("q1", { questionEn: null }))).toEqual({
      id: "q1",
      ko: "질문 q1",
      en: "",
      sampleAnswerKo: "답변 q1",
      sampleAnswerEn: null,
    })
  })
})

describe("uniquePracticeQueue", () => {
  it("drops repeats by id or Korean text and caps the size", () => {
    const queue: PracticeQuestion[] = [
      { id: "a", ko: "가", en: "" },
      { id: "a", ko: "가", en: "" },
      { ko: "나", en: "" },
      { ko: "나", en: "" },
      { ko: "다", en: "" },
    ]
    expect(uniquePracticeQueue(queue, 2).map((q) => q.ko)).toEqual(["가", "나"])
  })
})

describe("selectWeakQueue", () => {
  const questions = ["q1", "q2", "q3"].map((id) => bankItem(id))

  it("is empty before anything was practiced", () => {
    expect(selectWeakQueue(questions, {}, 5)).toEqual([])
  })

  it("leaves out strong questions", () => {
    const queue = selectWeakQueue(
      questions,
      {
        q1: progressRow("q1"),
        q2: progressRow("q2", { status: "strong", avgScore: 4.6, timesPracticed: 4 }),
      },
      5,
    )
    expect(queue.map((q) => q.id)).toContain("q1")
    expect(queue.map((q) => q.id)).not.toContain("q2")
  })
})

describe("firstOpenIndex", () => {
  const now = new Date("2026-11-02T00:30:00Z")
  const queue = ["q1", "q2", "q3"].map((id) => fromBankItem(bankItem(id)))

  it("skips questions already practiced today (Seoul)", () => {
    const progress = { q1: progressRow("q1", { lastPracticedAt: "2026-11-02T00:10:00Z" }) }
    expect(firstOpenIndex(queue, progress, now)).toBe(1)
  })

  it("starts over when every question is done", () => {
    const progress = Object.fromEntries(
      ["q1", "q2", "q3"].map((id) => [
        id,
        progressRow(id, { lastPracticedAt: "2026-11-02T00:10:00Z" }),
      ]),
    )
    expect(firstOpenIndex(queue, progress, now)).toBe(0)
  })

  it("treats questions without an id (AI) as open", () => {
    expect(firstOpenIndex([{ ko: "가", en: "" }], {}, now)).toBe(0)
  })
})

describe("recordAttempt", () => {
  const question: PracticeQuestion = { id: "q1", ko: "질문", en: "" }
  const result = {
    scores: {
      speaking: 3,
      grammar: 3,
      vocabulary: 3,
      pronunciation: 3,
      confidence: 3,
      naturalness: 3,
    },
    feedback: "",
    correctedAnswer: "",
    betterAlternative: "",
    tip: "",
  }

  it("groups attempts per question and keeps their order", () => {
    let runs = recordAttempt([], question, { answer: "첫 답", review: "compared" })
    runs = recordAttempt(runs, question, { answer: "첫 답", review: "checked", result })
    runs = recordAttempt(runs, { ko: "다른", en: "" }, { answer: "x", review: "compared" })
    expect(runs).toHaveLength(2)
    expect(runs[0].attempts.map((a) => a.review)).toEqual(["compared", "checked"])
    expect(checkedAttempts(runs[0])).toHaveLength(1)
    expect(checkedAttempts(runs[1])).toHaveLength(0)
  })
})
