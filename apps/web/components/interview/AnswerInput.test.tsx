/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AnswerMode } from "@/hooks/useAnswerMode"
import type { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { MIC_PRIVACY_NOTE, isTypingForced, type MicAccess } from "@/lib/mic-access"

import { AnswerInput } from "./AnswerInput"

type Speech = ReturnType<typeof useSpeechRecognition>

function fakeSpeech(overrides: Partial<Speech> = {}): Speech {
  return {
    supported: true,
    status: "idle",
    transcript: "",
    setTranscript: vi.fn(),
    error: "",
    errorKind: null,
    setError: vi.fn(),
    start: vi.fn(() => true),
    stop: vi.fn(() => "저는 걸어서 출근합니다"),
    reset: vi.fn(),
    ...overrides,
  }
}

function fakeMode(access: MicAccess, typingRequested = false): AnswerMode {
  const typingForced = isTypingForced(access)
  const typing = typingRequested || typingForced
  return {
    access,
    typing,
    typingForced,
    setTypingRequested: vi.fn(),
    canAutoListen: !typing,
  }
}

afterEach(cleanup)

describe("AnswerInput", () => {
  it("offers recording when the mic is ready, with no notice", () => {
    const speech = fakeSpeech()
    render(<AnswerInput speech={speech} mode={fakeMode("ready")} />)
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }))
    expect(speech.start).toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByLabelText("Your answer")).toBeNull()
  })

  it("hands the raw transcript back when recording stops", () => {
    const onCaptured = vi.fn()
    render(
      <AnswerInput
        speech={fakeSpeech({ status: "listening" })}
        mode={fakeMode("ready")}
        onCaptured={onCaptured}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }))
    expect(onCaptured).toHaveBeenCalledWith("저는 걸어서 출근합니다")
  })

  it("refuses to record over question audio", () => {
    const speech = fakeSpeech()
    render(<AnswerInput speech={speech} mode={fakeMode("ready")} audioPlaying />)
    expect(screen.getByRole("button", { name: "Start recording" })).toHaveProperty("disabled", true)
    expect(screen.getByText("Question audio is playing")).toBeTruthy()
  })

  it("shows the editable transcript after recording, in Korean", () => {
    const speech = fakeSpeech({ status: "finished", transcript: "지하철을 탑니다" })
    render(<AnswerInput speech={speech} mode={fakeMode("ready")} />)
    const editor = screen.getByLabelText("Your answer")
    expect(editor.getAttribute("lang")).toBe("ko")
    fireEvent.change(editor, { target: { value: "지하철을 타요" } })
    expect(speech.setTranscript).toHaveBeenCalledWith("지하철을 타요")
  })

  it("switches to typing on request", () => {
    const mode = fakeMode("ready")
    render(<AnswerInput speech={fakeSpeech()} mode={mode} />)
    fireEvent.click(screen.getByRole("button", { name: /Type instead/ }))
    expect(mode.setTypingRequested).toHaveBeenCalledWith(true)
  })

  it("lets a learner who chose typing go back to the mic", () => {
    const mode = fakeMode("ready", true)
    render(<AnswerInput speech={fakeSpeech()} mode={mode} />)
    expect(screen.queryByRole("button", { name: "Start recording" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Use the microphone/ }))
    expect(mode.setTypingRequested).toHaveBeenCalledWith(false)
  })

  it("explains a blocked mic, switches to typing, and offers a retry", () => {
    const speech = fakeSpeech({ error: "blocked", errorKind: "permission" })
    render(<AnswerInput speech={speech} mode={fakeMode("blocked")} />)
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toMatch(/Microphone access is blocked/)
    expect(alert.textContent).toMatch(/iPhone/)
    // The notice covers the error; it isn't repeated.
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByLabelText("Your answer")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Use the microphone/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Try the microphone again/ }))
    expect(speech.start).toHaveBeenCalled()
  })

  it("falls back to typing, with no mic button, when speech isn't supported", () => {
    render(<AnswerInput speech={fakeSpeech({ supported: false })} mode={fakeMode("unsupported")} />)
    expect(screen.getByRole("status").textContent).toMatch(/aren't available in this browser/)
    expect(screen.getByLabelText("Your answer")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Start recording" })).toBeNull()
  })

  it("mentions the browser prompt and where audio goes before first use", () => {
    render(<AnswerInput speech={fakeSpeech()} mode={fakeMode("needs-permission")} />)
    expect(screen.getByText(MIC_PRIVACY_NOTE)).toBeTruthy()
  })

  it("shows transient capture errors that the notice doesn't cover", () => {
    render(
      <AnswerInput
        speech={fakeSpeech({
          error: "Speech recognition needs an internet connection.",
          errorKind: "network",
        })}
        mode={fakeMode("ready")}
      />,
    )
    expect(screen.getByRole("alert").textContent).toMatch(/internet connection/)
  })
})
