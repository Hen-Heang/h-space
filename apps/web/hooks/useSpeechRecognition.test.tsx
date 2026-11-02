/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SPEECH_AUDIO_START_EVENT } from "../lib/speech-audio"

import { useSpeechRecognition } from "./useSpeechRecognition"

type MockResult = ArrayLike<{ transcript: string }> & { isFinal: boolean }

function speechResult(transcript: string, isFinal: boolean): MockResult {
  return Object.assign([{ transcript }], { isFinal })
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  continuous = false
  interimResults = false
  lang = ""
  onstart: (() => void) | null = null
  onresult: ((event: { results: ArrayLike<MockResult>; resultIndex: number }) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error?: string }) => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  emitStart() {
    this.onstart?.()
  }

  emitResult(results: MockResult[], resultIndex = 0) {
    this.onresult?.({ results, resultIndex })
  }

  emitEnd() {
    this.onend?.()
  }
}

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = []
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    })
  })

  it("keeps a multi-sentence answer across browser silence restarts", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "ko-KR", continuous: true }))
    const recognition = MockSpeechRecognition.instances[0]

    expect(recognition.lang).toBe("ko-KR")
    expect(recognition.continuous).toBe(true)
    expect(recognition.interimResults).toBe(true)

    act(() => {
      expect(result.current.start()).toBe(true)
      recognition.emitStart()
      recognition.emitResult([
        speechResult("저는 개발자입니다", true),
        speechResult("한국에서", false),
      ])
    })
    expect(result.current.transcript).toBe("저는 개발자입니다 한국에서")

    act(() => recognition.emitEnd())
    expect(recognition.start).toHaveBeenCalledTimes(2)

    act(() => {
      recognition.emitStart()
      recognition.emitResult([speechResult("열심히 준비했습니다", true)])
    })

    let stoppedTranscript = ""
    act(() => {
      stoppedTranscript = result.current.stop()
    })
    expect(stoppedTranscript).toBe("저는 개발자입니다 한국에서 열심히 준비했습니다")
    expect(result.current.status).toBe("finished")
  })

  it("keeps the final interim words when Stop is pressed", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "ko-KR", continuous: true }))
    const recognition = MockSpeechRecognition.instances[0]

    act(() => {
      result.current.start()
      recognition.emitStart()
      recognition.emitResult([speechResult("마지막 문장입니다", false)])
    })

    let stoppedTranscript = ""
    act(() => {
      stoppedTranscript = result.current.stop()
    })

    expect(stoppedTranscript).toBe("마지막 문장입니다")
    expect(result.current.transcript).toBe("마지막 문장입니다")

    act(() => {
      recognition.emitResult([speechResult("마지막 문장입니다", true)])
      recognition.emitEnd()
    })
    expect(result.current.transcript).toBe("마지막 문장입니다")
  })

  it("ignores a late result after reset instead of polluting the next answer", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "ko-KR", continuous: true }))
    const recognition = MockSpeechRecognition.instances[0]

    act(() => {
      result.current.start()
      recognition.emitStart()
      recognition.emitResult([speechResult("이전 답변", false)])
      result.current.reset()
      recognition.emitResult([speechResult("이전 답변", true)])
      recognition.emitEnd()
    })

    expect(result.current.transcript).toBe("")
    expect(result.current.status).toBe("idle")
  })

  it("stops microphone capture before prompt audio starts", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "ko-KR", continuous: true }))
    const recognition = MockSpeechRecognition.instances[0]

    act(() => {
      result.current.start()
      recognition.emitStart()
      window.dispatchEvent(new Event(SPEECH_AUDIO_START_EVENT))
    })

    expect(recognition.stop).toHaveBeenCalledTimes(1)
  })

  describe("errorKind", () => {
    function startCapture() {
      const hook = renderHook(() => useSpeechRecognition({ lang: "ko-KR", continuous: true }))
      const recognition = MockSpeechRecognition.instances[0]
      act(() => {
        hook.result.current.start()
        recognition.emitStart()
      })
      return { ...hook, recognition }
    }

    it.each([
      ["not-allowed", "permission", /permission is blocked/],
      ["audio-capture", "no-mic", /No microphone was found/],
      ["network", "network", /internet connection/],
      ["something-new", "other", /Speech capture failed/],
    ])("reports %s as %s with a readable message", (code, kind, message) => {
      const { result, recognition } = startCapture()
      act(() => recognition.onerror?.({ error: code }))
      expect(result.current.errorKind).toBe(kind)
      expect(result.current.error).toMatch(message)
      expect(result.current.status).toBe("idle")
    })

    it("keeps waiting through silence in continuous mode instead of failing", () => {
      const { result, recognition } = startCapture()
      act(() => recognition.onerror?.({ error: "no-speech" }))
      expect(result.current.errorKind).toBeNull()
      expect(result.current.status).toBe("listening")
    })

    it("clears the kind on the next successful start", () => {
      const { result, recognition } = startCapture()
      act(() => recognition.onerror?.({ error: "not-allowed" }))
      act(() => {
        result.current.start()
        recognition.emitStart()
      })
      expect(result.current.errorKind).toBeNull()
      expect(result.current.error).toBe("")
    })

    it("leaves the kind empty for app-level messages", () => {
      const { result, recognition } = startCapture()
      act(() => recognition.onerror?.({ error: "audio-capture" }))
      act(() => result.current.setError("Record or type a complete Korean answer."))
      expect(result.current.errorKind).toBeNull()
      expect(result.current.error).toBe("Record or type a complete Korean answer.")
    })

    it("reports unsupported when there is no recognition engine", () => {
      Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined })
      const { result } = renderHook(() => useSpeechRecognition())
      expect(result.current.supported).toBe(false)
      act(() => {
        result.current.start()
      })
      expect(result.current.errorKind).toBe("unsupported")
    })
  })
})
