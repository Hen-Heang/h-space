import { describe, expect, it } from "vitest"

import { aiModeHref, isAiMode, resolveAiMode } from "./chat-modes"

const params = (query: string) => new URLSearchParams(query)

describe("resolveAiMode", () => {
  it("opens General chat for bare /chat — the top bar's Ask Hengo link", () => {
    expect(resolveAiMode(params(""))).toBe("chat")
  })

  it("keeps direct links to every existing mode working", () => {
    expect(resolveAiMode(params("mode=memory"))).toBe("memory")
    expect(resolveAiMode(params("mode=analyze"))).toBe("analyze")
    expect(resolveAiMode(params("mode=generate"))).toBe("generate")
    expect(resolveAiMode(params("mode=corrections"))).toBe("corrections")
  })

  it("lands a ?prompt= deep link on General chat, whatever mode it names", () => {
    expect(resolveAiMode(params("mode=memory&prompt=hello"))).toBe("chat")
  })

  it("falls back to General chat for an unknown mode", () => {
    expect(resolveAiMode(params("mode=bogus"))).toBe("chat")
    expect(resolveAiMode(params("mode=chat"))).toBe("chat")
  })
})

describe("aiModeHref", () => {
  it("round-trips every mode through its URL", () => {
    for (const mode of ["chat", "memory", "analyze", "generate", "corrections"] as const) {
      const url = new URL(aiModeHref(mode), "https://example.test")
      expect(url.pathname).toBe("/chat")
      expect(resolveAiMode(url.searchParams)).toBe(mode)
    }
    expect(aiModeHref("chat")).toBe("/chat")
  })
})

describe("isAiMode", () => {
  it("accepts only known modes", () => {
    expect(isAiMode("memory")).toBe(true)
    expect(isAiMode("")).toBe(false)
    expect(isAiMode(null)).toBe(false)
  })
})
