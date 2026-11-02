/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { INTERVIEW_TOPICS } from "@/lib/interview"

import { PersonalExamReviewCard } from "./PersonalExamReviewCard"

const savedScript = vi.hoisted(() => ({
  current: {
    snapshot: null as { sections: Record<string, string>; updatedAt: string | null } | null,
    loading: false,
    syncFailed: false,
  },
}))

vi.mock("@/hooks/useExamPrepHome", () => ({
  useSavedScript: () => savedScript.current,
}))
// SpeakButton pulls in the TTS client; the card's script tab doesn't need it here.
vi.mock("@/components/ui/SpeakButton", () => ({ SpeakButton: () => null }))

const topic = INTERVIEW_TOPICS[0]
const seed = topic.scriptSeed ?? {}

describe("PersonalExamReviewCard script tab", () => {
  beforeEach(() => {
    savedScript.current = { snapshot: null, loading: false, syncFailed: false }
  })
  afterEach(cleanup)

  it("shows the learner's saved text and falls back to the draft for blank sections", () => {
    savedScript.current = {
      snapshot: {
        sections: { opening: "제가 직접 고친 인사말입니다.", transport: "" },
        updatedAt: "2026-11-01T10:00:00Z",
      },
      loading: false,
      syncFailed: false,
    }
    render(<PersonalExamReviewCard />)
    fireEvent.click(screen.getByRole("button", { name: /Script/ }))

    expect(screen.getByText("제가 직접 고친 인사말입니다.")).toBeTruthy()
    // Blank saved section → the drafted text, like the editor.
    const draftTransport = seed.transport.split("\n")[0]
    expect(screen.getByText((content) => content.includes(draftTransport))).toBeTruthy()
    expect(screen.getByText(/as last saved/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Edit script/ }).getAttribute("href")).toBe(
      "/interview/script",
    )
  })

  it("says it's the draft when nothing was saved", () => {
    render(<PersonalExamReviewCard />)
    fireEvent.click(screen.getByRole("button", { name: /Script/ }))
    expect(screen.getByText(/Your drafted script/)).toBeTruthy()
    expect(screen.getAllByText(/^\d\. /).length).toBe(topic.scriptOutline?.length)
  })

  it("keeps the curated Q&A as the default tab", () => {
    render(<PersonalExamReviewCard />)
    expect(screen.getByText("Real-story Q&A + question catcher")).toBeTruthy()
    expect(screen.getByText(/Listening rule/)).toBeTruthy()
  })
})
