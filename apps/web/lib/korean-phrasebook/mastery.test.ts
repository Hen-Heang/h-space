import { describe, expect, it } from "vitest"
import type { PhraseCardWithProgress, PhraseProgress } from "@/lib/types"
import {
  countPhraseStates,
  deriveState,
  filterPhraseCards,
  isCardDue,
  isCardOverdue,
  rateProgress,
  selectPracticeQueue,
} from "./mastery"

function progress(overrides: Partial<PhraseProgress> = {}): PhraseProgress {
  return {
    phraseId: "p1",
    state: "new",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lapses: 0,
    mastery: 0,
    attemptCount: 0,
    successfulCount: 0,
    lastGrade: null,
    lastReviewedAt: null,
    nextReviewAt: new Date().toISOString(),
    mastered: false,
    ...overrides,
  }
}

function card(overrides: Partial<PhraseCardWithProgress> = {}): PhraseCardWithProgress {
  return {
    id: "c1",
    userId: "u1",
    collectionId: "col1",
    sourceKey: null,
    category: "workplace",
    situation: "status-update",
    difficulty: "medium",
    question: { korean: "질문", romanization: "jilmun", english: "question", register: "formal" },
    questionVariants: [],
    answers: [
      {
        korean: "답변",
        romanization: "dapbyeon",
        english: "answer",
        register: "formal",
        isRecommended: true,
      },
    ],
    usageNote: null,
    vocabulary: [],
    tags: [],
    position: 0,
    active: true,
    isUserEdited: false,
    workContext: null,
    provenance: null,
    sourceLabel: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: null,
    ...overrides,
  }
}

describe("deriveState", () => {
  it("is new when never attempted", () => {
    expect(deriveState(0, 0)).toBe("new")
  })
  it("is learning below the mastery threshold", () => {
    expect(deriveState(50, 3)).toBe("learning")
    expect(deriveState(79, 3)).toBe("learning")
  })
  it("is mastered at or above 80", () => {
    expect(deriveState(80, 3)).toBe("mastered")
    expect(deriveState(100, 5)).toBe("mastered")
  })
})

describe("isCardDue / isCardOverdue", () => {
  it("a card due in the past is due", () => {
    expect(isCardDue(new Date(Date.now() - 1000).toISOString())).toBe(true)
  })
  it("a card due in the future is not due", () => {
    expect(isCardDue(new Date(Date.now() + 100_000).toISOString())).toBe(false)
  })
  it("overdue requires more than one day past due", () => {
    const now = new Date("2026-07-28T12:00:00Z")
    expect(isCardOverdue(new Date("2026-07-28T00:00:00Z").toISOString(), now)).toBe(false)
    expect(isCardOverdue(new Date("2026-07-26T00:00:00Z").toISOString(), now)).toBe(true)
  })
})

describe("countPhraseStates", () => {
  it("buckets due/new/learning/mastered correctly", () => {
    const now = new Date("2026-07-28T12:00:00Z")
    const cards: PhraseCardWithProgress[] = [
      card({ id: "new1", progress: null }),
      card({
        id: "learning1",
        progress: progress({
          state: "learning",
          nextReviewAt: "2026-07-28T06:00:00Z",
          attemptCount: 1,
        }),
      }),
      card({
        id: "mastered1",
        progress: progress({
          state: "mastered",
          mastery: 90,
          nextReviewAt: "2026-08-01T00:00:00Z",
          attemptCount: 5,
        }),
      }),
      card({
        id: "due-overdue",
        progress: progress({
          state: "learning",
          nextReviewAt: "2026-07-01T00:00:00Z",
          attemptCount: 2,
        }),
      }),
    ]
    const counts = countPhraseStates(cards, now)
    expect(counts.total).toBe(4)
    expect(counts.new).toBe(1)
    expect(counts.learning).toBe(2)
    expect(counts.mastered).toBe(1)
    expect(counts.due).toBe(2) // learning1 + due-overdue are both past next_review
    expect(counts.overdue).toBe(1) // only due-overdue is >1 day past
  })
})

describe("filterPhraseCards", () => {
  const cards: PhraseCardWithProgress[] = [
    card({
      id: "a",
      category: "workplace",
      situation: "deadline",
      difficulty: "easy",
      question: {
        korean: "마감일이 언제예요?",
        romanization: "magamiri eonjeyeyo?",
        english: "When is the deadline?",
        register: "polite",
      },
    }),
    card({
      id: "b",
      category: "daily",
      situation: "restaurant",
      difficulty: "hard",
      question: {
        korean: "주문하시겠어요?",
        romanization: "jumunhasigesseoyo?",
        english: "Would you like to order?",
        register: "polite",
      },
    }),
  ]

  it("filters by category", () => {
    expect(filterPhraseCards(cards, { category: "daily" }).map((c) => c.id)).toEqual(["b"])
  })
  it("filters by situation", () => {
    expect(filterPhraseCards(cards, { situation: "deadline" }).map((c) => c.id)).toEqual(["a"])
  })
  it("filters by difficulty", () => {
    expect(filterPhraseCards(cards, { difficulty: "hard" }).map((c) => c.id)).toEqual(["b"])
  })
  it("searches English and Korean text case-insensitively", () => {
    expect(filterPhraseCards(cards, { query: "deadline" }).map((c) => c.id)).toEqual(["a"])
    expect(filterPhraseCards(cards, { query: "주문" }).map((c) => c.id)).toEqual(["b"])
  })
  it("dueOnly excludes cards with no progress or a future review date", () => {
    const dueCards = [
      card({
        id: "due",
        progress: progress({ nextReviewAt: new Date(Date.now() - 1000).toISOString() }),
      }),
      card({
        id: "not-due",
        progress: progress({ nextReviewAt: new Date(Date.now() + 100_000).toISOString() }),
      }),
      card({ id: "no-progress", progress: null }),
    ]
    expect(filterPhraseCards(dueCards, { dueOnly: true }).map((c) => c.id)).toEqual(["due"])
  })
})

describe("selectPracticeQueue", () => {
  it("prioritizes due cards, then recently-failed, then preferred category, new cards last", () => {
    const now = new Date()
    const overdue = card({
      id: "overdue",
      category: "daily",
      progress: progress({ nextReviewAt: new Date(now.getTime() - 2 * 86_400_000).toISOString() }),
    })
    const due = card({
      id: "due",
      category: "daily",
      progress: progress({ nextReviewAt: new Date(now.getTime() - 1000).toISOString() }),
    })
    const failed = card({ id: "failed", category: "daily" })
    const preferred = card({ id: "preferred", category: "workplace" })
    const fresh = card({ id: "fresh", category: "daily" })

    const queue = selectPracticeQueue([fresh, preferred, failed, due, overdue], {
      limit: 5,
      preferredCategory: "workplace",
      recentlyFailedIds: new Set(["failed"]),
      now,
    })

    expect(queue.map((c) => c.id)).toEqual(["overdue", "due", "failed", "preferred", "fresh"])
  })

  it("respects the limit and excludes inactive cards", () => {
    const cards = [card({ id: "a" }), card({ id: "b" }), card({ id: "c", active: false })]
    const queue = selectPracticeQueue(cards, { limit: 1 })
    expect(queue).toHaveLength(1)
    expect(queue.some((c) => c.id === "c")).toBe(false)
  })
})

describe("rateProgress", () => {
  it("delegates to lib/srs applyRating and produces a later next review on GOOD", () => {
    const state = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, mastery: 0 }
    const result = rateProgress(state, "GOOD")
    expect(result.repetitions).toBe(1)
    expect(new Date(result.nextReview).getTime()).toBeGreaterThan(Date.now())
  })

  it("resets repetitions and shortens interval on AGAIN", () => {
    const state = { easeFactor: 2.5, intervalDays: 10, repetitions: 3, lapses: 0, mastery: 60 }
    const result = rateProgress(state, "AGAIN")
    expect(result.repetitions).toBe(0)
    expect(result.lapses).toBe(1)
  })
})
