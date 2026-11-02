"use client"

import { useState } from "react"

import { useMicPermission } from "@/hooks/useMicPermission"
import type { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { isTypingForced, resolveMicAccess, type MicAccess } from "@/lib/mic-access"

export interface AnswerMode {
  access: MicAccess
  /** The answer is typed: the learner chose it, or recording can't work here. */
  typing: boolean
  /** Typing because recording can't work (no switch back to the mic). */
  typingForced: boolean
  setTypingRequested: (typing: boolean) => void
  /** Safe to open the mic automatically (e.g. after question audio ends). */
  canAutoListen: boolean
}

/**
 * Voice-or-typing state for one answer box. Lives in the page (not inside
 * AnswerInput) because pages also decide whether to auto-open the mic.
 */
export function useAnswerMode(
  speech: Pick<ReturnType<typeof useSpeechRecognition>, "supported" | "errorKind">,
): AnswerMode {
  const permission = useMicPermission()
  const [typingRequested, setTypingRequested] = useState(false)
  const access = resolveMicAccess({
    speechSupported: speech.supported,
    permission,
    errorKind: speech.errorKind,
  })
  const typingForced = isTypingForced(access)
  // Latch: once recording failed (blocked, no mic), stay on typing even after
  // a retry or reset clears the error — until the learner chooses the mic
  // again ("Use the microphone" / "Try the microphone again").
  if (typingForced && !typingRequested) setTypingRequested(true)
  const typing = typingRequested || typingForced
  return { access, typing, typingForced, setTypingRequested, canAutoListen: !typing }
}
