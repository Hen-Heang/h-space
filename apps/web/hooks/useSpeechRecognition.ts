"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { classifySpeechError, speechErrorMessage, type SpeechErrorKind } from "@/lib/mic-access"
import { SPEECH_AUDIO_START_EVENT, stopSpeechAudio } from "@/lib/speech-audio"

// Minimal typing for the browser Web Speech API (no DOM lib types ship for it).
type BrowserRecognitionErrorEvent = {
  error?: string
}

type BrowserRecognitionResult = ArrayLike<{ transcript: string }> & {
  isFinal: boolean
}

type BrowserRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult:
    ((event: { results: ArrayLike<BrowserRecognitionResult>; resultIndex: number }) => void) | null
  onend: (() => void) | null
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
  abort?: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserRecognition
    webkitSpeechRecognition?: new () => BrowserRecognition
  }
}

export type RecognitionStatus = "idle" | "listening" | "finished"

type UseSpeechRecognitionOptions = {
  lang?: string
  /**
   * Keep the mic open across pauses until stop()/reset() is called, restarting
   * the engine whenever the browser ends it on silence. Off (default) captures
   * a single utterance and finishes at the first pause — the chat push-to-talk
   * behavior. Turn it on for multi-sentence answers (interview, drills).
   */
  continuous?: boolean
  /** Called with the captured transcript when a capture completes. */
  onResult?: (transcript: string) => void
}

function joinSpeech(...parts: string[]) {
  return parts.filter(Boolean).join(" ").trim()
}

/**
 * Wraps the browser ko-KR speech recognition used across speaking-style
 * features. Returns the live transcript (interim words appear as you speak)
 * plus controls; falls back gracefully to manual entry when the API is
 * unavailable (e.g. Firefox, some webviews).
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = "ko-KR", continuous = false, onResult } = options

  const [status, setStatus] = useState<RecognitionStatus>("idle")
  const [transcript, setTranscriptState] = useState("")
  const [error, setErrorState] = useState("")
  // Why the last capture failed, for UI that needs more than the message
  // (mic-blocked notices, typing fallback). Null for app-set messages.
  const [errorKind, setErrorKind] = useState<SpeechErrorKind | null>(null)
  const fail = useCallback((kind: SpeechErrorKind) => {
    setErrorState(speechErrorMessage(kind))
    setErrorKind(kind)
  }, [])
  const clearError = useCallback(() => {
    setErrorState("")
    setErrorKind(null)
  }, [])
  // Public setter for app-level messages ("Record or type an answer…").
  const setError = useCallback((message: string) => {
    setErrorState(message)
    setErrorKind(null)
  }, [])
  // Mirrors `transcript` so callbacks held across renders (e.g. start() fired
  // after question audio ends) never seed a capture from a stale closure.
  const transcriptRef = useRef("")
  const setTranscript = useCallback((value: string) => {
    transcriptRef.current = value
    setTranscriptState(value)
  }, [])
  const recognitionRef = useRef<BrowserRecognition | null>(null)
  const onResultRef = useRef(onResult)
  // Text that existed before this capture started (earlier takes / manual edits).
  const baseRef = useRef("")
  // Finalized speech accumulated during the current capture.
  const finalsRef = useRef("")
  // Latest not-yet-final words — committed on end if the engine never
  // finalizes them (happens when a capture is stopped mid-word).
  const interimRef = useRef("")
  // True once the user (or unmount) asked to stop — suppresses auto-restart.
  const manualStopRef = useRef(true)
  // reset()/unmount can race with the browser's last result event. Ignore late
  // events so an old answer cannot leak into the next interview question.
  const ignoreResultsRef = useRef(true)
  // Prevent a fast double click from calling start() twice before onstart.
  const startingRef = useRef(false)
  const listeningRef = useRef(false)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      return
    }

    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onstart = () => {
      startingRef.current = false
      if (ignoreResultsRef.current) {
        recognition.stop()
        return
      }
      listeningRef.current = true
      setStatus("listening")
      clearError()
    }

    recognition.onresult = (event) => {
      if (ignoreResultsRef.current) return

      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = Array.from(result)
          .map((item) => item.transcript)
          .join(" ")
          .trim()
        if (!text) continue
        if (result.isFinal) {
          finalsRef.current = joinSpeech(finalsRef.current, text)
        } else {
          interim = joinSpeech(interim, text)
        }
      }
      interimRef.current = interim
      setTranscript(joinSpeech(baseRef.current, finalsRef.current, interim))
    }

    recognition.onend = () => {
      startingRef.current = false
      listeningRef.current = false
      if (ignoreResultsRef.current) return

      // The browser ends recognition on its own after silence or engine
      // hiccups. In continuous mode that isn't the user stopping — restart and
      // keep listening until stop()/reset() is actually called.
      if (continuous && !manualStopRef.current) {
        // Words still pending as interim won't be re-delivered after a
        // restart — commit them so nothing the user saw disappears.
        finalsRef.current = joinSpeech(finalsRef.current, interimRef.current)
        interimRef.current = ""
        try {
          startingRef.current = true
          recognition.start()
          return
        } catch {
          startingRef.current = false
          // Engine refused the restart — fall through and finish the capture.
        }
      }

      const captured = joinSpeech(finalsRef.current, interimRef.current)
      finalsRef.current = captured
      interimRef.current = ""
      setTranscript(joinSpeech(baseRef.current, captured))
      if (captured) {
        setStatus("finished")
        onResultRef.current?.(joinSpeech(baseRef.current, captured))
      } else {
        setStatus((current) => (current === "listening" ? "idle" : current))
      }
    }

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return
      }
      const kind = classifySpeechError(event.error)

      if (kind === "permission") {
        manualStopRef.current = true
        startingRef.current = false
        listeningRef.current = false
        setStatus("idle")
        fail("permission")
        return
      }

      if (kind === "no-speech") {
        // Continuous captures just keep waiting (onend restarts the engine);
        // only a single-shot capture treats silence as a failed take.
        if (continuous) return
        setStatus("idle")
        fail("no-speech")
        return
      }

      manualStopRef.current = true
      startingRef.current = false
      listeningRef.current = false
      setStatus("idle")
      fail(kind)
    }

    recognitionRef.current = recognition

    const stopForPromptAudio = () => {
      if (!listeningRef.current && !startingRef.current) return
      manualStopRef.current = true
      startingRef.current = false
      listeningRef.current = false
      try {
        recognition.stop()
      } catch {
        // It may have ended between the event and this handler.
      }
    }
    window.addEventListener(SPEECH_AUDIO_START_EVENT, stopForPromptAudio)

    return () => {
      manualStopRef.current = true
      ignoreResultsRef.current = true
      startingRef.current = false
      listeningRef.current = false
      window.removeEventListener(SPEECH_AUDIO_START_EVENT, stopForPromptAudio)
      recognition.onstart = null
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      try {
        if (recognition.abort) recognition.abort()
        else recognition.stop()
      } catch {
        recognition.stop()
      }
      recognitionRef.current = null
    }
  }, [lang, continuous, setTranscript, fail, clearError])

  function start() {
    if (!recognitionRef.current) {
      fail("unsupported")
      return false
    }

    if (startingRef.current || listeningRef.current || status === "listening") return false

    clearError()
    // Do not let the examiner's TTS or a replay become the candidate answer.
    stopSpeechAudio()
    manualStopRef.current = false
    ignoreResultsRef.current = false
    startingRef.current = true
    finalsRef.current = ""
    interimRef.current = ""
    // Continuous captures append to earlier takes/edits instead of wiping them,
    // so tapping Record again continues the answer rather than restarting it.
    if (continuous) {
      baseRef.current = transcriptRef.current
    } else {
      baseRef.current = ""
      setTranscript("")
    }

    try {
      recognitionRef.current.start()
      return true
    } catch {
      startingRef.current = false
      manualStopRef.current = true
      setStatus("idle")
      fail("start-failed")
      return false
    }
  }

  function stop() {
    manualStopRef.current = true
    startingRef.current = false
    listeningRef.current = false
    // Commit a synchronous snapshot so a Submit click immediately after Stop
    // includes the final interim phrase instead of reading stale React state.
    const captured = joinSpeech(finalsRef.current, interimRef.current)
    const completeTranscript = joinSpeech(baseRef.current, captured)
    setTranscript(completeTranscript)
    setStatus(completeTranscript ? "finished" : "idle")
    try {
      recognitionRef.current?.stop()
    } catch {
      // The engine may already have stopped on a pause; the snapshot is safe.
    }
    return completeTranscript
  }

  function reset() {
    manualStopRef.current = true
    ignoreResultsRef.current = true
    startingRef.current = false
    listeningRef.current = false
    try {
      const recognition = recognitionRef.current
      if (recognition?.abort) recognition.abort()
      else recognition?.stop()
    } catch {
      recognitionRef.current?.stop()
    }
    baseRef.current = ""
    finalsRef.current = ""
    interimRef.current = ""
    setStatus("idle")
    setTranscript("")
    clearError()
  }

  return {
    supported,
    status,
    transcript,
    setTranscript,
    error,
    errorKind,
    setError,
    start,
    stop,
    reset,
  }
}
