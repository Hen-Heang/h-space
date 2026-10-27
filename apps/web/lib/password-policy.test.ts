import { describe, expect, it } from "vitest"

import { passwordPolicyError } from "./password-policy"

describe("passwordPolicyError", () => {
  it("accepts a password meeting every rule", () => {
    expect(passwordPolicyError("Correct-horse9")).toBeNull()
  })

  it("lists every missing requirement", () => {
    expect(passwordPolicyError("short")).toBe(
      "Password must contain at least 12 characters, an uppercase letter, a digit, a special character.",
    )
  })

  it("requires a special character", () => {
    expect(passwordPolicyError("Abcdefghijk1")).toBe("Password must contain a special character.")
  })

  it("counts non-ASCII letters as letters, not special characters", () => {
    expect(passwordPolicyError("Ébcdefghijk1")).toBe("Password must contain a special character.")
  })

  it("rejects passwords over bcrypt's 72-character limit", () => {
    expect(passwordPolicyError(`Aa1!${"x".repeat(69)}`)).toBe(
      "Password must be at most 72 characters.",
    )
  })
})
