import { describe, expect, it } from "vitest"

import { usernameFormatError } from "./username"

describe("usernameFormatError", () => {
  it.each(["abc", "jane.doe", "Jane_Doe99", "a".repeat(30)])("accepts %s", (name) => {
    expect(usernameFormatError(name)).toBeNull()
  })

  it("ignores surrounding whitespace", () => {
    expect(usernameFormatError("  jane ")).toBeNull()
  })

  it("rejects names that are too short or too long", () => {
    expect(usernameFormatError("ab")).toBe("Username must be at least 3 characters.")
    expect(usernameFormatError("a".repeat(31))).toBe("Username must be at most 30 characters.")
  })

  it.each(["jane@doe", "_jane", "jane.", "jane doe", "jané"])("rejects %s", (name) => {
    expect(usernameFormatError(name)).toMatch(/^Username must be 3–30 characters/)
  })
})
