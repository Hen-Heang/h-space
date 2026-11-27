import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({
  SUPABASE_URL: "https://example.supabase.invalid",
  SUPABASE_KEY: "sb_publishable_synthetic",
  assertSupabaseConfigured: vi.fn(),
  supabase: { auth: {} },
}))
vi.mock("@/lib/api/auth", () => ({ authApi: {} }))

import {
  finishGitHubSignIn,
  githubCallbackUrl,
  parseGitHubCallback,
  startGitHubSignIn,
} from "./github-auth"

// Optional GitHub sign-in (G1): only the URL/parameter handling is unit-tested
// here; nothing in this file proves a real GitHub OAuth round trip.

describe("githubCallbackUrl / parseGitHubCallback", () => {
  it("GH-01: the app callback is /auth/callback on this origin, separate from the provider's", () => {
    expect(githubCallbackUrl("http://localhost:3000", "/inbox")).toBe(
      "http://localhost:3000/auth/callback?next=%2Finbox",
    )
    expect(githubCallbackUrl("http://localhost:3000", null)).toBe(
      "http://localhost:3000/auth/callback",
    )
  })

  it("GH-04: external, protocol-relative and backslash next values are dropped", () => {
    for (const next of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
    ]) {
      expect(githubCallbackUrl("http://localhost:3000", next)).toBe(
        "http://localhost:3000/auth/callback",
      )
      const parsed = parseGitHubCallback(`?code=abc&next=${encodeURIComponent(next)}`)
      expect(parsed).toEqual({ kind: "code", code: "abc", next: null })
    }
  })

  it("GH-03: provider errors are generic; a missing or odd code is refused", () => {
    expect(
      parseGitHubCallback("?error=access_denied&error_description=Click+here+evil.example"),
    ).toEqual({
      kind: "error",
    })
    expect(parseGitHubCallback("")).toEqual({ kind: "missing" })
    expect(parseGitHubCallback("?code=")).toEqual({ kind: "missing" })
    expect(parseGitHubCallback("?code=a%20b")).toEqual({ kind: "missing" })
    expect(parseGitHubCallback(`?code=${"a".repeat(600)}`)).toEqual({ kind: "missing" })
  })

  it("keeps a same-site next path", () => {
    expect(parseGitHubCallback("?code=abc-123&next=%2Fgoals%3Ftab%3D1")).toEqual({
      kind: "code",
      code: "abc-123",
      next: "/goals?tab=1",
    })
  })

  it("GH-10: with the feature off, starting or finishing refuses (no redirect, no exchange)", async () => {
    await expect(startGitHubSignIn("/home")).rejects.toThrow(/isn't enabled/)
    await expect(finishGitHubSignIn("abc")).rejects.toThrow(/isn't enabled/)
  })
})
