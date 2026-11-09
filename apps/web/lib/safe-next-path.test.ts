import { describe, expect, it } from "vitest"

import { loginHref, safeNextPath } from "./safe-next-path"

describe("safeNextPath", () => {
  it("keeps same-site paths with their query and hash", () => {
    expect(safeNextPath("/oauth/consent?authorization_id=abc123")).toBe(
      "/oauth/consent?authorization_id=abc123",
    )
    expect(safeNextPath("/notes/sql-basics#joins")).toBe("/notes/sql-basics#joins")
    expect(safeNextPath("/home")).toBe("/home")
  })

  it.each([
    ["absolute URL", "https://evil.example/home"],
    ["protocol-relative", "//evil.example/home"],
    ["backslash host", "/\\evil.example"],
    ["backslash later", "/a\\b"],
    ["script scheme", "javascript:alert(1)"],
    ["relative path", "home"],
    ["tab trick", "/\t/evil.example"],
    ["newline", "/home\n"],
    ["empty", ""],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull()
  })

  it("rejects auth pages so sign-in cannot loop", () => {
    expect(safeNextPath("/login")).toBeNull()
    expect(safeNextPath("/login?next=/home")).toBeNull()
    expect(safeNextPath("/register")).toBeNull()
    expect(safeNextPath("/reset-password/token")).toBeNull()
    // A page that merely starts with the same letters is fine.
    expect(safeNextPath("/login-help")).toBe("/login-help")
  })

  it("rejects overlong values", () => {
    expect(safeNextPath(`/${"a".repeat(2001)}`)).toBeNull()
  })

  it("normalises dot segments without leaving the site", () => {
    expect(safeNextPath("/a/../../oauth/consent")).toBe("/oauth/consent")
  })
})

describe("loginHref", () => {
  it("carries the current page, encoded", () => {
    expect(loginHref("/oauth/consent?authorization_id=abc123")).toBe(
      "/login?next=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc123",
    )
  })

  it("is plain /login for the default page or anything unsafe", () => {
    expect(loginHref("/home")).toBe("/login")
    expect(loginHref("//evil.example")).toBe("/login")
  })
})
