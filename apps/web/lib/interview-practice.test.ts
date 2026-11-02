import { describe, expect, it } from "vitest"

import {
  averageScore,
  computeNextProgress,
  countDoneToday,
  daysRemainingInSeoul,
  difficultyCounts,
  duplicateVersionLabel,
  focusScore,
  mostDifficultQuestions,
  recommendedDifficulty,
  scoreImprovement,
  selectFocusQueue,
  selectTodaysQueue,
  shouldRecommendRetry,
  suggestUniqueVersionLabel,
  summarizeQuestionProgress,
  todayQueueStorageKey,
  transitionRetryFlow,
  versionsToDeactivate,
  type QuestionBankItem,
  type QuestionProgress,
} from "./interview-practice"

function question(overrides: Partial<QuestionBankItem>): QuestionBankItem {
  return {
    id: "q1",
    questionKo: "질문",
    questionEn: "Question",
    sampleAnswerKo: null,
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

function progress(overrides: Partial<QuestionProgress>): QuestionProgress {
  return {
    questionId: "q1",
    timesPracticed: 1,
    avgScore: 3,
    lastScore: 3,
    lastPracticedAt: new Date().toISOString(),
    status: "practicing",
    ...overrides,
  }
}

describe("averageScore", () => {
  it("averages every numeric value", () => {
    expect(averageScore({ a: 4, b: 2 })).toBe(3)
  })

  it("returns 0 for an empty scores object", () => {
    expect(averageScore({})).toBe(0)
  })
})

describe("computeNextProgress", () => {
  it("starts a brand-new question at timesPracticed 1", () => {
    const next = computeNextProgress(null, 4)
    expect(next.timesPracticed).toBe(1)
    expect(next.avgScore).toBe(4)
    expect(next.status).toBe("practicing")
  })

  it("averages incrementally across repeated practice", () => {
    const first = computeNextProgress(null, 2)
    const second = computeNextProgress(first, 4)
    expect(second.timesPracticed).toBe(2)
    expect(second.avgScore).toBe(3)
  })

  it("derives 'strong' once average score is high enough", () => {
    const next = computeNextProgress({ timesPracticed: 3, avgScore: 4.5 }, 4.5)
    expect(next.status).toBe("strong")
  })

  it("derives 'improving' after enough attempts at a solid but not top score", () => {
    const next = computeNextProgress({ timesPracticed: 1, avgScore: 3.6 }, 3.8)
    expect(next.status).toBe("improving")
  })
})

describe("focusScore", () => {
  it("ranks never-practiced questions above any practiced one", () => {
    const neverPracticed = focusScore(question({ priority: "optional" }), null)
    const practicedHighScore = focusScore(
      question({ priority: "must_practice" }),
      progress({ avgScore: 5, timesPracticed: 5 }),
    )
    expect(neverPracticed).toBeGreaterThan(practicedHighScore)
  })

  it("ranks lower average scores as more urgent", () => {
    const weak = focusScore(question({}), progress({ avgScore: 2 }))
    const strong = focusScore(question({}), progress({ avgScore: 4.5 }))
    expect(weak).toBeGreaterThan(strong)
  })

  it("uses priority as a tiebreaker for equal scores", () => {
    const mustPractice = focusScore(
      question({ priority: "must_practice" }),
      progress({ avgScore: 3, lastPracticedAt: null }),
    )
    const optional = focusScore(
      question({ priority: "optional" }),
      progress({ avgScore: 3, lastPracticedAt: null }),
    )
    expect(mustPractice).toBeGreaterThan(optional)
  })
})

describe("selectFocusQueue", () => {
  it("returns an empty queue for an empty bank", () => {
    expect(selectFocusQueue([], {}, 5)).toEqual([])
  })

  it("puts never-practiced questions first, deterministically", () => {
    const questions = [
      question({ id: "practiced-well", displayOrder: 0 }),
      question({ id: "never-practiced", displayOrder: 1 }),
    ]
    const progressMap: Record<string, QuestionProgress> = {
      "practiced-well": progress({ questionId: "practiced-well", avgScore: 5, timesPracticed: 5 }),
    }
    const queue = selectFocusQueue(questions, progressMap, 2)
    expect(queue[0].id).toBe("never-practiced")
  })

  it("is stable across repeated calls with the same input (no randomness)", () => {
    const questions = [
      question({ id: "a", displayOrder: 0 }),
      question({ id: "b", displayOrder: 1 }),
      question({ id: "c", displayOrder: 2 }),
    ]
    const first = selectFocusQueue(questions, {}, 3).map((q) => q.id)
    const second = selectFocusQueue(questions, {}, 3).map((q) => q.id)
    expect(first).toEqual(second)
  })

  it("caps results to the requested size", () => {
    const questions = [question({ id: "a" }), question({ id: "b" }), question({ id: "c" })]
    expect(selectFocusQueue(questions, {}, 1)).toHaveLength(1)
  })
})

describe("exam planning", () => {
  it("calculates remaining civil days in Asia/Seoul", () => {
    expect(daysRemainingInSeoul("2026-08-29", new Date("2026-08-03T15:30:00Z"))).toBe(25)
    expect(daysRemainingInSeoul("2026-08-29", new Date("2026-08-28T15:30:00Z"))).toBe(0)
  })

  it("recommends the correct difficulty window", () => {
    expect(recommendedDifficulty(25)).toBe("beginner")
    expect(recommendedDifficulty(24)).toBe("normal")
    expect(recommendedDifficulty(14)).toBe("normal")
    expect(recommendedDifficulty(13)).toBe("challenging")
    expect(recommendedDifficulty(6)).toBe("challenging")
    expect(recommendedDifficulty(5)).toBe("mixed")
  })
})

describe("selectTodaysQueue", () => {
  const bank = [
    question({ id: "b1", difficulty: "beginner", priority: "recommended", displayOrder: 1 }),
    question({ id: "b2", difficulty: "beginner", priority: "must_practice", displayOrder: 2 }),
    question({ id: "b3", difficulty: "beginner", priority: "recommended", displayOrder: 3 }),
    question({ id: "b4", difficulty: "beginner", priority: "recommended", displayOrder: 4 }),
    question({ id: "b5", difficulty: "beginner", priority: "recommended", displayOrder: 5 }),
    question({ id: "n1", difficulty: "normal", priority: "must_practice", displayOrder: 6 }),
  ]

  it("filters by difficulty and returns stable unique ids", () => {
    const first = selectTodaysQueue(bank, {}, "beginner", 5)
    const second = selectTodaysQueue(bank, {}, "beginner", 5)
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
    expect(first.every((item) => item.difficulty === "beginner")).toBe(true)
    expect(new Set(first.map((item) => item.id)).size).toBe(5)
  })

  it("prioritizes must-practise questions", () => {
    expect(selectTodaysQueue(bank, {}, "beginner", 1)[0].id).toBe("b2")
  })

  it("prioritizes new questions over strong questions", () => {
    const samePriority = bank.map((item) => ({ ...item, priority: "recommended" as const }))
    const progressMap = {
      b2: progress({ questionId: "b2", status: "strong", avgScore: 4.8, timesPracticed: 4 }),
    }
    expect(
      selectTodaysQueue(samePriority, progressMap, "beginner", 2).map((item) => item.id),
    ).toEqual(["b1", "b3"])
  })

  it("prioritizes lower-scoring practised questions", () => {
    const practised = bank
      .slice(0, 2)
      .map((item) => ({ ...item, priority: "recommended" as const }))
    const queue = selectTodaysQueue(
      practised,
      {
        b1: progress({ questionId: "b1", avgScore: 4, timesPracticed: 2 }),
        b2: progress({ questionId: "b2", avgScore: 2, timesPracticed: 2 }),
      },
      "beginner",
      2,
    )
    expect(queue.map((item) => item.id)).toEqual(["b2", "b1"])
  })

  it("fills from other difficulties when fewer than five match", () => {
    const queue = selectTodaysQueue(bank, {}, "normal", 5)
    expect(queue).toHaveLength(5)
    expect(queue[0].id).toBe("n1")
  })

  it("preserves stored ids after progress changes", () => {
    const stored = ["b4", "b3", "b2", "b1", "b5"]
    const queue = selectTodaysQueue(
      bank,
      {
        b4: progress({ questionId: "b4", avgScore: 5, status: "strong" }),
      },
      "beginner",
      5,
      stored,
    )
    expect(queue.map((item) => item.id)).toEqual(stored)
  })

  it("derives level counts from the bank", () => {
    expect(difficultyCounts(bank)).toEqual({ beginner: 5, normal: 1, challenging: 0, mixed: 6 })
  })
})

describe("todayQueueStorageKey", () => {
  it("keeps the key format existing devices already store", () => {
    expect(todayQueueStorageKey("2026-11-02", "normal")).toBe(
      "koriai.interview.today:2026-11-02:normal",
    )
  })
})

describe("countDoneToday", () => {
  // 2026-11-02 09:30 KST
  const now = new Date("2026-11-02T00:30:00Z")
  const practiced = (iso: string | null) => progress({ lastPracticedAt: iso })

  it("counts questions practiced on the same Seoul day", () => {
    const result = countDoneToday(
      ["a", "b", "c"],
      {
        a: practiced("2026-11-02T00:10:00Z"), // 09:10 KST today
        b: practiced("2026-11-01T10:00:00Z"), // 19:00 KST yesterday
      },
      now,
    )
    expect(result).toEqual({ done: 1, total: 3 })
  })

  it("uses the Seoul day boundary, not UTC", () => {
    // 2026-11-01 15:30Z is 00:30 KST on Nov 2 — today in Seoul, yesterday in UTC.
    const result = countDoneToday(["a"], { a: practiced("2026-11-01T15:30:00Z") }, now)
    expect(result.done).toBe(1)
    // 2026-11-01 14:59Z is 23:59 KST on Nov 1 — yesterday in Seoul.
    expect(countDoneToday(["a"], { a: practiced("2026-11-01T14:59:00Z") }, now).done).toBe(0)
  })

  it("ignores never-practiced, unknown, malformed, and duplicate ids", () => {
    const result = countDoneToday(
      ["a", "a", "b", "missing", "bad"],
      {
        a: practiced("2026-11-02T01:00:00Z"),
        b: practiced(null),
        bad: practiced("not a date"),
      },
      now,
    )
    expect(result).toEqual({ done: 1, total: 4 })
  })

  it("is empty before today's queue is pinned", () => {
    expect(countDoneToday([], {}, now)).toEqual({ done: 0, total: 0 })
  })
})

describe("progress summary and retry", () => {
  it("explains an empty progress state through zero practiced counts", () => {
    const summary = summarizeQuestionProgress([question({ id: "a" }), question({ id: "b" })], {})
    expect(summary).toMatchObject({ total: 2, practiced: 0, newCount: 2, needsRetry: 0 })
  })

  it("counts practising, improving, and strong states", () => {
    const questions = [question({ id: "a" }), question({ id: "b" }), question({ id: "c" })]
    const summary = summarizeQuestionProgress(questions, {
      a: progress({ questionId: "a", status: "practicing", avgScore: 2 }),
      b: progress({ questionId: "b", status: "improving", avgScore: 3.7, timesPracticed: 2 }),
      c: progress({ questionId: "c", status: "strong", avgScore: 4.5, timesPracticed: 3 }),
    })
    expect(summary).toMatchObject({
      practiced: 3,
      practicing: 1,
      improving: 1,
      strong: 1,
      needsRetry: 1,
    })
  })

  it("computes first-attempt versus retry improvement", () => {
    expect(scoreImprovement(2.3, 3.8)).toBe(1.5)
    expect(shouldRecommendRetry(3.4)).toBe(true)
    expect(shouldRecommendRetry(3.5)).toBe(false)
  })
})

describe("retry flow", () => {
  it("moves through correction, retry, and completion states", () => {
    expect(transitionRetryFlow("ready", "score")).toBe("correction")
    expect(transitionRetryFlow("correction", "retry")).toBe("retrying")
    expect(transitionRetryFlow("retrying", "retry_scored")).toBe("correction")
    expect(transitionRetryFlow("correction", "skip")).toBe("completed")
  })
})

describe("script version labels", () => {
  it("warns about duplicate labels case-insensitively", () => {
    expect(duplicateVersionLabel("final practice version", ["Final Practice Version"])).toBe(true)
  })

  it("suggests the next unique numbered label", () => {
    expect(
      suggestUniqueVersionLabel("Final Practice Version", [
        "Final Practice Version",
        "Final Practice Version 2",
      ]),
    ).toBe("Final Practice Version 3")
  })
})

describe("mostDifficultQuestions", () => {
  it("excludes questions that have never been practiced", () => {
    const questions = [question({ id: "a" }), question({ id: "b" })]
    const result = mostDifficultQuestions(
      questions,
      {
        a: progress({ questionId: "a", avgScore: 2, timesPracticed: 2 }),
      },
      5,
    )
    expect(result.map((q) => q.id)).toEqual(["a"])
  })

  it("sorts lowest average score first", () => {
    const questions = [question({ id: "a" }), question({ id: "b" })]
    const result = mostDifficultQuestions(
      questions,
      {
        a: progress({ questionId: "a", avgScore: 4, timesPracticed: 3 }),
        b: progress({ questionId: "b", avgScore: 2, timesPracticed: 3 }),
      },
      5,
    )
    expect(result.map((q) => q.id)).toEqual(["b", "a"])
  })

  it("returns an empty list when nothing has been practiced yet", () => {
    expect(mostDifficultQuestions([question({})], {}, 5)).toEqual([])
  })
})

describe("versionsToDeactivate", () => {
  it("returns the other active version's id when activating a new one", () => {
    const versions = [
      { id: "v1", isActive: true },
      { id: "v2", isActive: false },
    ]
    expect(versionsToDeactivate(versions, "v2")).toEqual(["v1"])
  })

  it("returns an empty list when nothing else is active", () => {
    const versions = [{ id: "v1", isActive: false }]
    expect(versionsToDeactivate(versions, "v1")).toEqual([])
  })

  it("does not deactivate the version being activated even if already active", () => {
    const versions = [{ id: "v1", isActive: true }]
    expect(versionsToDeactivate(versions, "v1")).toEqual([])
  })
})
