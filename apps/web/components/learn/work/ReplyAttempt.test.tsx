/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReplyAttempt } from "./ReplyAttempt"

// jsdom has no SpeechRecognition — the same situation as an unsupported
// browser. Typing must still work, and nothing asks for the microphone.
afterEach(cleanup)

describe("ReplyAttempt without speech recognition", () => {
  it("says voice isn't available, hides the mic button, and submits typed text", () => {
    const getUserMedia = vi.fn()
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    })
    const onSubmit = vi.fn()
    render(<ReplyAttempt onSubmit={onSubmit} busy={false} />)

    expect(screen.getByText(/Voice input isn't available/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Speak/ })).toBeNull()
    expect(getUserMedia).not.toHaveBeenCalled()

    const submit = screen.getByRole("button", { name: "Check my reply" }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText("What you mean (English, optional)"), {
      target: { value: "I will test it." },
    })
    fireEvent.change(screen.getByLabelText("Your reply in Korean"), {
      target: { value: "테스트하겠습니다." },
    })
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      korean: "테스트하겠습니다.",
      intendedMeaning: "I will test it.",
      inputMethod: "text",
    })
  })

  it("doesn't submit while busy (a double click can't send twice)", () => {
    const onSubmit = vi.fn()
    render(<ReplyAttempt onSubmit={onSubmit} busy />)
    fireEvent.change(screen.getByLabelText("Your reply in Korean"), { target: { value: "네" } })
    fireEvent.click(screen.getByRole("button", { name: "Checking…" }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
