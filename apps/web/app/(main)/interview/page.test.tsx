/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Regression test for the exam timer retry loop: ExamTimer calls onExpire on
// every tick once time is up, and a failed evaluation used to be retried on
// each of them (two paid AI calls a second). The timer is replaced with a
// button so the test can fire as many "ticks" as it wants.

const api = vi.hoisted(() => ({
  createConversation: vi.fn(),
  streamMessage: vi.fn(),
  evaluate: vi.fn(),
  listAttempts: vi.fn(),
  saveAttempt: vi.fn(),
  speak: vi.fn(),
}))

const speechState = vi.hoisted(() => ({ transcript: "" }))

vi.mock("@/lib/api", () => ({
  chatApi: { createConversation: api.createConversation, streamMessage: api.streamMessage },
  interviewApi: {
    evaluate: api.evaluate,
    listAttempts: api.listAttempts,
    saveAttempt: api.saveAttempt,
  },
  ttsApi: { speak: api.speak },
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: () => ({
    supported: true,
    errorKind: null,
    status: "idle",
    transcript: speechState.transcript,
    start: vi.fn(),
    stop: () => speechState.transcript,
    reset: vi.fn(),
  }),
}))
vi.mock("@/hooks/useAnswerMode", () => ({
  useAnswerMode: () => ({ typing: true, typingForced: false, canAutoListen: false }),
}))
vi.mock("@/hooks/useLogActivity", () => ({ useLogActivity: () => ({ logActivity: vi.fn() }) }))
vi.mock("@/hooks/useSessionTimer", () => ({ useSessionTimer: () => {} }))
vi.mock("@/hooks/useLeaveGuard", () => ({ useLeaveGuard: () => {} }))
vi.mock("@/hooks/useScrollToTopOnChange", () => ({ useScrollToTopOnChange: () => {} }))

vi.mock("@/components/interview/ExamPrepHome", () => ({
  ExamPrepHome: ({
    onModeChange,
    onStartMock,
  }: {
    onModeChange: (mode: "practice" | "exam") => void
    onStartMock: () => void
  }) => (
    <div>
      <button type="button" onClick={() => onModeChange("exam")}>
        Exam mode
      </button>
      <button type="button" onClick={onStartMock}>
        Start mock
      </button>
    </div>
  ),
}))
vi.mock("@/components/interview/ExamTimer", () => ({
  ExamTimer: ({ onExpire }: { onExpire: () => void }) => (
    <button type="button" onClick={onExpire}>
      Timer tick
    </button>
  ),
}))
vi.mock("@/components/interview/AnswerInput", () => ({ AnswerInput: () => null }))
vi.mock("@/components/interview/EvaluationSummary", () => ({
  EvaluationSummary: () => <p>Evaluation summary</p>,
}))

import { buildEvaluationPrompt } from "@/lib/interview"

import InterviewPage from "./page"

const isEvaluationPrompt = (message: unknown) => message === buildEvaluationPrompt()

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function startExam({ withAnswer }: { withAnswer: boolean }) {
  speechState.transcript = withAnswer ? "저는 백엔드 개발자입니다" : ""
  render(<InterviewPage />)
  fireEvent.click(screen.getByRole("button", { name: "Exam mode" }))
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start mock" }))
  })
  await screen.findByRole("button", { name: "Timer tick" })
}

async function answerOnce() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }))
  })
  await flush()
}

async function tick(times = 1) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Timer tick" }))
    })
    await flush()
  }
}

/** Calls made to score the exam: the evaluate route plus the chat fallback. */
function evaluationCalls() {
  const fallback = api.streamMessage.mock.calls.filter(([, message]) => isEvaluationPrompt(message))
  return api.evaluate.mock.calls.length + fallback.length
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  speechState.transcript = ""
  window.localStorage.clear()
  api.listAttempts.mockResolvedValue([])
  api.saveAttempt.mockResolvedValue(undefined)
  api.speak.mockRejectedValue(new Error("no tts in tests"))
  api.createConversation.mockResolvedValue({ id: "conv-1" })
  api.evaluate.mockRejectedValue(new Error("evaluate route down"))
  api.streamMessage.mockImplementation(
    async (_id: string, message: string, onToken: (token: string) => void) => {
      if (isEvaluationPrompt(message)) {
        throw new Error("chat fallback down")
      }
      onToken("자기소개를 해 주세요.")
    },
  )
})

describe("InterviewPage exam timer expiry", () => {
  it("tries the evaluation once when time is up, not on every later tick", async () => {
    await startExam({ withAnswer: true })
    await answerOnce()
    const before = evaluationCalls()

    await tick(5)

    // One automatic attempt = the evaluate route + its chat fallback.
    expect(api.evaluate).toHaveBeenCalledTimes(1)
    expect(evaluationCalls() - before).toBe(2)
    expect(await screen.findByText(/could not generate your evaluation/i)).toBeTruthy()
  })

  it("offers Finish as the retry once time is up, even below the exam's answer minimum", async () => {
    await startExam({ withAnswer: true })
    await answerOnce()
    // Exam mode needs 4 answers before an early finish.
    expect(screen.queryByRole("button", { name: /finish & get evaluation/i })).toBeNull()

    await tick(3)
    const finish = screen.getByRole("button", { name: /finish & get evaluation/i })

    api.evaluate.mockResolvedValueOnce({
      scores: [],
      summary: "Synthetic summary",
      advice: [],
      analytics: null,
    })
    await act(async () => {
      fireEvent.click(finish)
    })
    await flush()

    expect(api.evaluate).toHaveBeenCalledTimes(2)
    // The retry succeeded, so the session moved on to the summary.
    expect(screen.getByText("Evaluation summary")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Timer tick" })).toBeNull()
  })

  it("doesn't pay to score an exam with no answers", async () => {
    await startExam({ withAnswer: false })

    await tick(4)

    expect(evaluationCalls()).toBe(0)
    expect(screen.getByText(/nothing to score/i)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /finish & get evaluation/i })).toBeNull()
  })
})
