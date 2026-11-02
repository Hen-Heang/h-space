import { describe, expect, it } from "vitest"

import {
  classifySpeechError,
  isTypingForced,
  MIC_ACCESS_COPY,
  resolveMicAccess,
  speechErrorMessage,
  type MicAccess,
} from "./mic-access"

describe("classifySpeechError", () => {
  it.each([
    ["not-allowed", "permission"],
    ["service-not-allowed", "permission"],
    ["no-speech", "no-speech"],
    ["audio-capture", "no-mic"],
    ["network", "network"],
    ["bad-grammar", "other"],
    [undefined, "other"],
  ] as const)("maps %s to %s", (code, kind) => {
    expect(classifySpeechError(code)).toBe(kind)
  })
})

describe("speechErrorMessage", () => {
  it("keeps the wording the speaking pages already showed", () => {
    expect(speechErrorMessage("permission")).toBe(
      "Microphone permission is blocked. Allow microphone access in the browser and try again.",
    )
    expect(speechErrorMessage("no-mic")).toMatch(/^No microphone was found/)
  })

  it("points to typing when the network drops", () => {
    expect(speechErrorMessage("network")).toMatch(/internet connection/)
    expect(speechErrorMessage("network")).toMatch(/type your answer/)
  })
})

describe("resolveMicAccess", () => {
  const base = { speechSupported: true, permission: "unknown" as const, errorKind: null }

  it("is unsupported without the Web Speech API, whatever the permission", () => {
    expect(resolveMicAccess({ ...base, speechSupported: false, permission: "granted" })).toBe(
      "unsupported",
    )
  })

  it("is blocked when the permission is denied", () => {
    expect(resolveMicAccess({ ...base, permission: "denied" })).toBe("blocked")
  })

  it("is blocked after a permission error when the permission can't be queried", () => {
    expect(resolveMicAccess({ ...base, errorKind: "permission" })).toBe("blocked")
  })

  it("is ready again once the user allows the mic, despite the stale error", () => {
    expect(resolveMicAccess({ ...base, permission: "granted", errorKind: "permission" })).toBe(
      "ready",
    )
  })

  it("reports a missing microphone even when permission is granted", () => {
    expect(resolveMicAccess({ ...base, permission: "granted", errorKind: "no-mic" })).toBe("no-mic")
  })

  it("needs permission before the first prompt", () => {
    expect(resolveMicAccess({ ...base, permission: "prompt" })).toBe("needs-permission")
  })

  it("assumes ready when nothing is known, so recording can trigger the browser prompt", () => {
    expect(resolveMicAccess(base)).toBe("ready")
  })

  it("does not treat transient capture errors as blocking", () => {
    for (const errorKind of ["no-speech", "network", "start-failed", "other"] as const) {
      expect(resolveMicAccess({ ...base, permission: "granted", errorKind })).toBe("ready")
    }
  })
})

describe("isTypingForced", () => {
  it.each([
    ["unsupported", true],
    ["blocked", true],
    ["no-mic", true],
    ["needs-permission", false],
    ["ready", false],
  ] as [MicAccess, boolean][])("%s → %s", (access, forced) => {
    expect(isTypingForced(access)).toBe(forced)
  })
})

describe("MIC_ACCESS_COPY", () => {
  it("gives unblock steps for desktop and iPhone", () => {
    expect(MIC_ACCESS_COPY.blocked.steps?.join(" ")).toMatch(/address bar/)
    expect(MIC_ACCESS_COPY.blocked.steps?.join(" ")).toMatch(/iPhone/)
  })

  it("never claims audio stays on the device", () => {
    for (const copy of Object.values(MIC_ACCESS_COPY)) {
      expect(copy.body.toLowerCase()).not.toMatch(/never leaves|stays on your device/)
    }
  })
})
