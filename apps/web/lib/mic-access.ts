// Microphone and speech-recognition access for the speaking features, as one
// state the UI can render. Pure: the browser bits (Permissions API, Web Speech
// errors) are read by hooks and passed in, so every state is unit-testable.

/** What went wrong in a speech-recognition capture, by cause rather than message. */
export type SpeechErrorKind =
  "permission" | "no-speech" | "no-mic" | "network" | "start-failed" | "unsupported" | "other"

/** The browser's microphone permission; "unknown" when it can't be queried (e.g. Firefox). */
export type MicPermission = "granted" | "denied" | "prompt" | "unknown"

/**
 * - `unsupported`: no Web Speech API in this browser; typing is the only path.
 * - `blocked`: the user or browser denied the microphone.
 * - `no-mic`: permission is fine but no capture device was found.
 * - `needs-permission`: the browser will ask on the first recording.
 * - `ready`: recording should work.
 */
export type MicAccess = "unsupported" | "blocked" | "no-mic" | "needs-permission" | "ready"

/** Maps a Web Speech `SpeechRecognitionErrorEvent.error` code to a kind. */
export function classifySpeechError(code: string | undefined): SpeechErrorKind {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission"
    case "no-speech":
      return "no-speech"
    case "audio-capture":
      return "no-mic"
    case "network":
      return "network"
    default:
      return "other"
  }
}

// The wording predates this module (useSpeechRecognition); keep it stable.
const SPEECH_ERROR_MESSAGES: Record<SpeechErrorKind, string> = {
  permission:
    "Microphone permission is blocked. Allow microphone access in the browser and try again.",
  "no-speech": "No speech was detected. Try holding the phone closer and speaking once clearly.",
  "no-mic": "No microphone was found. Connect or enable a microphone, then try again.",
  network:
    "Speech recognition needs an internet connection. Check your connection and try again, or type your answer.",
  "start-failed": "Could not start microphone capture. Wait a moment and try again.",
  unsupported: "Speech recognition is not available here. Use the manual transcript box instead.",
  other: "Speech capture failed. You can still type or edit the transcript manually.",
}

export function speechErrorMessage(kind: SpeechErrorKind): string {
  return SPEECH_ERROR_MESSAGES[kind]
}

export function resolveMicAccess({
  speechSupported,
  permission,
  errorKind,
}: {
  speechSupported: boolean
  permission: MicPermission
  errorKind: SpeechErrorKind | null
}): MicAccess {
  if (!speechSupported) return "unsupported"
  if (errorKind === "no-mic") return "no-mic"
  // A live "granted" wins over a stale permission error: the user may have
  // just allowed the mic in site settings.
  if (permission === "granted") return "ready"
  if (permission === "denied" || errorKind === "permission") return "blocked"
  if (permission === "prompt") return "needs-permission"
  return "ready"
}

/** States in which recording can't work, so the answer box switches to typing. */
export function isTypingForced(access: MicAccess): boolean {
  return access === "unsupported" || access === "blocked" || access === "no-mic"
}

export interface MicAccessCopy {
  title: string
  body: string
  /** Steps shown as a list (blocked only). */
  steps?: string[]
  /** "alert" interrupts a screen reader; "status" is announced politely. */
  tone: "alert" | "info"
}

// Honest about where audio goes: H-Space stores only text, but the browser's
// own recognizer (Chrome, Safari) may send audio to its vendor to transcribe.
export const MIC_PRIVACY_NOTE =
  "Your browser turns your voice into text (Chrome and Safari may process the audio on their own servers). H-Space never stores audio — only the text transcript is saved and checked."

export const MIC_ACCESS_COPY: Record<Exclude<MicAccess, "ready">, MicAccessCopy> = {
  unsupported: {
    title: "Voice answers aren't available in this browser",
    body: "Type your answers instead. To answer out loud, open H-Space in Chrome or Safari.",
    tone: "info",
  },
  blocked: {
    title: "Microphone access is blocked",
    body: "Allow the microphone for this site, then try again — or type your answer for now.",
    steps: [
      "Desktop: click the site settings icon at the left of the address bar, set Microphone to Allow, then reload.",
      "iPhone: Settings → Apps → Safari → Microphone → Allow (or tap aA in the address bar → Website Settings).",
    ],
    tone: "alert",
  },
  "no-mic": {
    title: "No microphone found",
    body: "Connect or enable a microphone and try again, or type your answer for now.",
    tone: "alert",
  },
  "needs-permission": {
    title: "Your browser will ask to use the microphone",
    body: MIC_PRIVACY_NOTE,
    tone: "info",
  },
}
