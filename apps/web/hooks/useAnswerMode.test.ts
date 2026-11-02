/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SpeechErrorKind } from "@/lib/mic-access"

import { useAnswerMode } from "./useAnswerMode"

describe("useAnswerMode", () => {
  it("records by default when speech recognition works", () => {
    const { result } = renderHook(() => useAnswerMode({ supported: true, errorKind: null }))
    expect(result.current.typing).toBe(false)
    expect(result.current.canAutoListen).toBe(true)
  })

  it("forces typing without speech recognition", () => {
    const { result } = renderHook(() => useAnswerMode({ supported: false, errorKind: null }))
    expect(result.current).toMatchObject({ typing: true, typingForced: true, canAutoListen: false })
  })

  it("stays on typing after a blocked mic's error is cleared by a retry or reset", () => {
    const { result, rerender } = renderHook(
      ({ errorKind }: { errorKind: SpeechErrorKind | null }) =>
        useAnswerMode({ supported: true, errorKind }),
      { initialProps: { errorKind: "permission" } },
    )
    expect(result.current.typing).toBe(true)

    rerender({ errorKind: null })
    expect(result.current.typing).toBe(true)
    expect(result.current.typingForced).toBe(false)
    expect(result.current.canAutoListen).toBe(false)

    // The learner chooses the mic again.
    act(() => result.current.setTypingRequested(false))
    expect(result.current.typing).toBe(false)
  })
})
