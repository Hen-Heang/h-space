/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ListeningLesson } from "@/lib/types"

// Synthetic lesson — no real study data.
const lesson: ListeningLesson = {
  id: "lesson-1",
  topic: "Daily Standup",
  title: "Morning sync",
  level: "intermediate",
  lines: [
    {
      speaker: "A",
      korean: "오늘 배포 일정 확인했어요?",
      english: "Did you check today's deploy schedule?",
    },
    { speaker: "B", korean: "네, 오후 세 시예요.", english: "Yes, it's at 3 p.m." },
  ],
  quiz: [
    {
      question: "When is the deploy?",
      options: ["9 a.m.", "Noon", "3 p.m.", "Tomorrow"],
      answerIndex: 2,
      explanation: "B says 오후 세 시.",
    },
    {
      question: "What did A ask about?",
      options: ["Lunch", "The deploy schedule", "A bug", "A meeting room"],
      answerIndex: 1,
      explanation: "",
    },
  ],
}

const api = vi.hoisted(() => ({
  getTopics: vi.fn(async () => ["Daily Standup", "Code Review"]),
  generate: vi.fn(),
  submitAttempt: vi.fn(),
  speak: vi.fn(async () => "blob:audio"),
}))

vi.mock("@/lib/api", () => ({
  listeningApi: {
    getTopics: api.getTopics,
    generate: api.generate,
    submitAttempt: api.submitAttempt,
  },
  ttsApi: { speak: api.speak },
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}))
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock("@/components/layout/WorkspaceTabs", () => ({ WorkspaceTabs: () => null }))
vi.mock("@/hooks/useLogActivity", () => ({ useLogActivity: () => ({ logActivity: vi.fn() }) }))
vi.mock("@/hooks/useSessionTimer", () => ({ useSessionTimer: () => {} }))

import ListeningPage from "./page"

beforeEach(() => {
  api.generate.mockReset().mockResolvedValue(lesson)
  api.submitAttempt.mockReset().mockResolvedValue({
    lessonId: "lesson-1",
    score: 1,
    total: 2,
    accuracy: 50,
    results: [true, false],
  })
  api.speak.mockClear()
})

afterEach(cleanup)

async function generateLesson() {
  render(<ListeningPage />)
  fireEvent.click(screen.getByRole("button", { name: /generate lesson/i }))
  await screen.findByRole("heading", { name: "Morning sync" })
}

describe("ListeningPage", () => {
  it("has no page-level h1 and marks the selected topic as pressed", async () => {
    render(<ListeningPage />)
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
    const topics = screen.getByRole("group", { name: "Topic" })
    expect(topics.querySelector('[aria-pressed="true"]')?.textContent).toBe("Daily Standup")
    await waitFor(() => expect(api.getTopics).toHaveBeenCalled())
  })

  it("shows the transcript in Korean only when asked, without generating audio", async () => {
    await generateLesson()
    const toggle = screen.getByRole("button", { name: /show transcript/i })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText("오늘 배포 일정 확인했어요?")).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText("오늘 배포 일정 확인했어요?").getAttribute("lang")).toBe("ko")
    // Revealing text must never trigger a paid TTS request.
    expect(api.speak).not.toHaveBeenCalled()
  })

  it("asks questions as radio groups and enables Submit only when all are answered", async () => {
    await generateLesson()
    const q1 = screen.getByRole("group", { name: "1. When is the deploy?" })
    expect(q1.querySelectorAll('input[type="radio"]')).toHaveLength(4)

    const submit = screen.getByRole("button", { name: "Submit answers" })
    expect((submit as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole("radio", { name: "3 p.m." }))
    expect((screen.getByRole("radio", { name: "3 p.m." }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText("1 of 2 answered")).toBeTruthy()

    fireEvent.click(screen.getByRole("radio", { name: "Lunch" }))
    expect((submit as HTMLButtonElement).disabled).toBe(false)
  })

  it("submits in question order, then labels results in text and moves focus to the score", async () => {
    await generateLesson()
    fireEvent.click(screen.getByRole("radio", { name: "3 p.m." }))
    fireEvent.click(screen.getByRole("radio", { name: "Lunch" }))
    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }))

    await screen.findByText("1 of 2 correct · 50%")
    expect(api.submitAttempt).toHaveBeenCalledWith("lesson-1", [2, 0])
    // Correctness is spelled out, not only colour-coded.
    expect(screen.getAllByText("Correct answer")).toHaveLength(2)
    expect(screen.getByText("Your answer")).toBeTruthy()
    expect(document.activeElement?.textContent).toContain("1 of 2 correct")
    // Scored lessons lock their answers.
    expect((screen.getByRole("radio", { name: "Noon" }) as HTMLInputElement).disabled).toBe(true)
  })

  it("confirms before a new lesson discards unsubmitted answers", async () => {
    await generateLesson()
    fireEvent.click(screen.getByRole("radio", { name: "Noon" }))
    fireEvent.click(screen.getByRole("button", { name: "New lesson" }))

    const dialog = await screen.findByRole("alertdialog", { name: "Start a new lesson?" })
    expect(dialog).toBeTruthy()
    expect(api.generate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Keep this lesson" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(api.generate).toHaveBeenCalledTimes(1)
    expect((screen.getByRole("radio", { name: "Noon" }) as HTMLInputElement).checked).toBe(true)
  })

  it("starts a new lesson without asking when nothing would be lost", async () => {
    await generateLesson()
    fireEvent.click(screen.getByRole("button", { name: "New lesson" }))
    expect(screen.queryByRole("alertdialog")).toBeNull()
    await waitFor(() => expect(api.generate).toHaveBeenCalledTimes(2))
  })

  it("shows an error instead of a stuck Pause button when playback is blocked", async () => {
    const play = vi.fn(() => Promise.reject(new Error("NotAllowedError")))
    class FakeAudio {
      playbackRate = 1
      onended: (() => void) | null = null
      play = play
      pause = vi.fn()
    }
    vi.stubGlobal("Audio", FakeAudio)
    try {
      await generateLesson()
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Play" }))
      })
      await screen.findByText(/couldn't play the audio/i)
      expect(screen.getByRole("button", { name: "Play" })).toBeTruthy()
      expect(api.speak).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
