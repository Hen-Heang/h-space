/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ScriptSummary, TodayPracticePlan } from "@/lib/exam-prep-home"
import type { QuestionBankItem, QuestionProgress } from "@/lib/interview-practice"

import { ExamProgressCard } from "./ExamProgressCard"
import { ModePicker } from "./ModePicker"
import { ScriptCard } from "./ScriptCard"
import { TODAY_PRACTICE_HREF, TodayPracticeCard } from "./TodayPracticeCard"

afterEach(cleanup)

function question(id: string, overrides: Partial<QuestionBankItem> = {}): QuestionBankItem {
  return {
    id,
    questionKo: `한국에서 어떤 습관이 생겼어요? ${id}`,
    questionEn: `What habits did you pick up in Korea? ${id}`,
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

function plan(overrides: Partial<TodayPracticePlan>): TodayPracticePlan {
  const queue = ["q1", "q2", "q3", "q4", "q5"].map((id) => question(id))
  return { status: "not-started", queue, done: 0, total: 5, next: queue[0], ...overrides }
}

describe("TodayPracticeCard", () => {
  const props = { loading: false, error: false, onRetry: vi.fn(), levelLabel: "Normal" }

  it("starts today's five straight into the drill", () => {
    render(<TodayPracticeCard {...props} plan={plan({})} />)
    const start = screen.getByRole("link", { name: /Start today's 5/ })
    expect(start.getAttribute("href")).toBe(TODAY_PRACTICE_HREF)
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("0 of 5 done")
  })

  it("shows the next question in Korean with English on demand", () => {
    const next = question("q3")
    render(<TodayPracticeCard {...props} plan={plan({ status: "in-progress", done: 2, next })} />)
    expect(screen.getByText(next.questionKo).getAttribute("lang")).toBe("ko")
    const english = screen.getByText(next.questionEn!)
    expect(english.hidden).toBe(true)
    const toggle = screen.getByRole("button", { name: "Show English" })
    fireEvent.click(toggle)
    expect(english.hidden).toBe(false)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("link", { name: /Continue today's 5/ })).toBeTruthy()
  })

  it("celebrates a finished day without hiding the option to go again", () => {
    render(<TodayPracticeCard {...props} plan={plan({ status: "done", done: 5, next: null })} />)
    expect(screen.getByText("All 5 done today")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Practice them again/ })).toBeTruthy()
  })

  it("shows skeletons while loading", () => {
    render(<TodayPracticeCard {...props} loading plan={plan({})} />)
    expect(screen.getByLabelText("Loading today's practice").getAttribute("aria-busy")).toBe("true")
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("offers a retry when the bank can't load", () => {
    const onRetry = vi.fn()
    render(<TodayPracticeCard {...props} error onRetry={onRetry} plan={plan({})} />)
    expect(screen.getByRole("alert").textContent).toMatch(/Couldn't load your question bank/)
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("explains an empty bank instead of offering a drill that can't run", () => {
    render(
      <TodayPracticeCard
        {...props}
        plan={{ status: "empty", queue: [], done: 0, total: 0, next: null }}
      />,
    )
    expect(screen.getByText(/question bank is empty/)).toBeTruthy()
    expect(screen.queryByRole("link", { name: /today's 5/ })).toBeNull()
  })
})

describe("ModePicker", () => {
  it("is a radio group that arrow keys move through", () => {
    const onChange = vi.fn()
    render(<ModePicker value="practice" onChange={onChange} />)
    const practice = screen.getByRole("radio", { name: "Practice" })
    expect(practice.getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("radio", { name: "Exam Simulation" }).tabIndex).toBe(-1)
    fireEvent.keyDown(practice, { key: "ArrowRight" })
    expect(onChange).toHaveBeenCalledWith("exam")
  })

  it("states the chosen mode's rules", () => {
    render(<ModePicker value="exam" onChange={vi.fn()} />)
    expect(screen.getByText("10 min")).toBeTruthy()
    expect(screen.getByText("Korean only")).toBeTruthy()
  })
})

describe("ScriptCard", () => {
  const summary: ScriptSummary = {
    sectionsWritten: 8,
    totalSections: 8,
    words: 412,
    lastSavedAt: null,
    untouched: true,
  }
  const props = {
    loading: false,
    syncFailed: false,
    dueLabel: "Nov 20",
    due: { kind: "upcoming", days: 18 },
  } as const

  it("summarizes the script and links to the editor and Listen & Repeat", () => {
    render(<ScriptCard {...props} summary={summary} />)
    expect(screen.getByText("8 / 8")).toBeTruthy()
    expect(screen.getByText("412")).toBeTruthy()
    expect(screen.getByText(/Due Nov 20 · 18 days left/)).toBeTruthy()
    expect(screen.getByText(/Not saved yet/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Edit script/ }).getAttribute("href")).toBe(
      "/interview/script",
    )
    expect(screen.getByRole("link", { name: /Listen & Repeat/ }).getAttribute("href")).toBe(
      "/interview/repeat",
    )
  })

  it("says when it could only read this device's copy", () => {
    render(
      <ScriptCard
        {...props}
        syncFailed
        summary={{ ...summary, lastSavedAt: "2026-11-01T10:00:00Z" }}
      />,
    )
    // Date wording follows the viewer's locale, so only the prefix is fixed.
    expect(screen.getByText(/^Last saved \S/)).toBeTruthy()
    expect(screen.getByText(/showing this device's/)).toBeTruthy()
  })
})

describe("ExamProgressCard", () => {
  const questions = [question("q1"), question("q2"), question("q3")]
  const practiced: Record<string, QuestionProgress> = {
    q1: {
      questionId: "q1",
      timesPracticed: 2,
      avgScore: 2.1,
      lastScore: 2,
      lastPracticedAt: "2026-11-01T10:00:00Z",
      status: "practicing",
    },
  }
  const props = {
    questions,
    loading: false,
    error: false,
    onRetry: vi.fn(),
    historySyncFailed: false,
    onRetryHistory: vi.fn(),
  }

  it("guides a new learner instead of showing empty lists", () => {
    render(<ExamProgressCard {...props} progress={{}} history={[]} />)
    expect(screen.getByText("0 of 3 questions practiced")).toBeTruthy()
    expect(screen.getByText(/Finish today's practice/)).toBeTruthy()
    expect(screen.getByText(/None yet — take one/)).toBeTruthy()
  })

  it("lists weak questions and labels the mock score as an AI estimate", () => {
    render(
      <ExamProgressCard
        {...props}
        progress={practiced}
        history={[{ id: "a", date: "2026-11-01T10:00:00Z", overall: 3.25, scores: [] }]}
      />,
    )
    expect(screen.getByText("1 of 3 questions practiced")).toBeTruthy()
    expect(screen.getByText(questions[0].questionKo).getAttribute("lang")).toBe("ko")
    expect(screen.getByText(/3\.3 \/ 5|3\.2 \/ 5/)).toBeTruthy()
    expect(screen.getByText(/AI estimate from your transcript/)).toBeTruthy()
  })

  it("shows a failed account sync with its own retry", () => {
    const onRetryHistory = vi.fn()
    render(
      <ExamProgressCard
        {...props}
        progress={{}}
        history={[]}
        historySyncFailed
        onRetryHistory={onRetryHistory}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }))
    expect(onRetryHistory).toHaveBeenCalled()
  })
})
