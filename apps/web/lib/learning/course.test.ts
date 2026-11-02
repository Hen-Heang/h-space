import { describe, expect, it } from "vitest"

import {
  continueReadingUnit,
  lessonAfter,
  lessonStatus,
  nextIncompleteLesson,
  phraseStatus,
  readingStatus,
} from "./course"

const NOW = new Date("2026-11-02T12:00:00Z")

describe("status mapping", () => {
  it("maps Foundations lessons", () => {
    expect(lessonStatus({ completed: false, progress: 0 })).toBe("new")
    expect(lessonStatus({ completed: false, progress: 40 })).toBe("in_progress")
    expect(lessonStatus({ completed: true, progress: 40 })).toBe("completed")
  })

  it("maps Reading units, treating missing progress as new", () => {
    expect(readingStatus(undefined)).toBe("new")
    expect(readingStatus({ status: "not_started" })).toBe("new")
    expect(readingStatus({ status: "in_progress" })).toBe("in_progress")
    expect(readingStatus({ status: "completed" })).toBe("completed")
  })

  it("maps Phrasebook cards, with a due review taking priority", () => {
    const past = "2026-11-01T00:00:00Z"
    const future = "2026-11-05T00:00:00Z"
    expect(phraseStatus(null, NOW)).toBe("new")
    expect(phraseStatus({ state: "new", nextReviewAt: future }, NOW)).toBe("new")
    expect(phraseStatus({ state: "learning", nextReviewAt: future }, NOW)).toBe("in_progress")
    expect(phraseStatus({ state: "mastered", nextReviewAt: future }, NOW)).toBe("mastered")
    expect(phraseStatus({ state: "mastered", nextReviewAt: past }, NOW)).toBe("review_due")
  })
})

describe("continue selection", () => {
  const lessons = [
    { id: "a", completed: true },
    { id: "b", completed: false },
    { id: "c", completed: false },
  ]

  it("continues with the first incomplete lesson", () => {
    expect(nextIncompleteLesson(lessons)?.id).toBe("b")
    expect(nextIncompleteLesson(lessons.map((l) => ({ ...l, completed: true })))).toBeUndefined()
  })

  it("finds the lesson after the current one", () => {
    expect(lessonAfter(lessons, "a")?.id).toBe("b")
    expect(lessonAfter(lessons, "c")).toBeUndefined()
    expect(lessonAfter(lessons, "missing")).toBeUndefined()
  })

  it("prefers a started reading unit, then the first unstarted one", () => {
    const units = [{ id: "u1" }, { id: "u2" }, { id: "u3" }]
    expect(
      continueReadingUnit(units, { u1: { status: "completed" }, u3: { status: "in_progress" } })
        ?.id,
    ).toBe("u3")
    expect(continueReadingUnit(units, { u1: { status: "completed" } })?.id).toBe("u2")
    expect(
      continueReadingUnit(units, {
        u1: { status: "completed" },
        u2: { status: "completed" },
        u3: { status: "completed" },
      }),
    ).toBeUndefined()
  })
})
