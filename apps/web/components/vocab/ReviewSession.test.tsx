/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  vocabApi: { lookup: vi.fn(), getBestStreak: vi.fn(async () => ({ bestStreak: 0 })) },
}))
vi.mock("@/lib/vocab-best-streak-store", () => ({
  loadBestStreak: vi.fn(async () => 0),
  submitBestStreak: vi.fn(async (n: number) => n),
}))

import type { VocabItem } from "@/lib/types"
import { ReviewSession } from "./ReviewSession"

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO
})

afterEach(cleanup)

function word(id: string, term: string): VocabItem {
  return {
    id,
    category: "Work",
    term,
    meaning: `meaning of ${term}`,
    mastery: 0,
    nextReview: "2026-01-01T00:00:00Z",
    tags: [],
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
  }
}

const due = [word("a", "안건"), word("b", "회의")]

function renderSession(onRate = vi.fn()) {
  render(<ReviewSession dueToday={due} dueCount={2} allWords={due} onRate={onRate} />)
  return onRate
}

function startReview() {
  fireEvent.click(screen.getByRole("button", { name: "Start review" }))
  return screen.getByRole("dialog", { name: "Memory Lab — review session" })
}

function flipAndGrade(label: RegExp) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))
  })
  fireEvent.click(screen.getByRole("button", { name: label }))
}

describe("Memory Lab review session", () => {
  it("leads with the batch and opens the session as a named dialog", () => {
    renderSession()
    expect(screen.getByRole("heading", { name: "Review 2 words" })).toBeTruthy()
    const dialog = startReview()
    // Korean terms are marked up for screen readers and CJK line breaking.
    expect(dialog.querySelector('[lang="ko"]')).not.toBeNull()
  })

  it("saves each grade through onRate", () => {
    const onRate = renderSession()
    startReview()
    flipAndGrade(/^Good/)
    expect(onRate).toHaveBeenCalledTimes(1)
    expect(onRate.mock.calls[0][1]).toBe("GOOD")
  })

  it("asks before leaving once something is graded, and can keep reviewing", () => {
    renderSession()
    startReview()
    flipAndGrade(/^Good/)

    fireEvent.click(screen.getByRole("button", { name: "Leave review" }))
    const confirm = screen.getByRole("alertdialog", { name: "Leave this review?" })
    fireEvent.click(within(confirm).getByRole("button", { name: "Keep reviewing" }))
    expect(screen.getByRole("dialog", { name: "Memory Lab — review session" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Leave review" }))
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Leave" }))
    expect(screen.getByRole("dialog", { name: "Memory Lab — set up a review" })).toBeTruthy()
  })

  it("leaves straight away when nothing has been graded yet", () => {
    renderSession()
    startReview()
    fireEvent.click(screen.getByRole("button", { name: "Leave review" }))
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.getByRole("dialog", { name: "Memory Lab — set up a review" })).toBeTruthy()
  })

  it("closes the setup screen with Escape", () => {
    renderSession()
    fireEvent.click(screen.getByRole("button", { name: "Customize" }))
    const dialog = screen.getByRole("dialog", { name: "Memory Lab — set up a review" })
    fireEvent.keyDown(dialog, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("button", { name: "Start review" })).toBeTruthy()
  })
})
