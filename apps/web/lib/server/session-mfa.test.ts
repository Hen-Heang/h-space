import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { accessTokenAal, hasVerifiedFactor, mfaRequirementMet } from "./session-mfa"

function token(claims: Record<string, unknown>) {
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url")
  return `${encode({ alg: "ES256" })}.${encode(claims)}.sig`
}

const verified = [{ status: "verified" }]

describe("mfaRequirementMet", () => {
  it("passes an account without a verified authenticator, whatever the aal", () => {
    expect(mfaRequirementMet([], token({ aal: "aal1" }))).toBe(true)
    expect(mfaRequirementMet(null, token({ aal: "aal1" }))).toBe(true)
    expect(mfaRequirementMet([{ status: "unverified" }], token({ aal: "aal1" }))).toBe(true)
  })

  it("passes an account with an authenticator only on an aal2 session", () => {
    expect(mfaRequirementMet(verified, token({ aal: "aal2" }))).toBe(true)
    expect(mfaRequirementMet(verified, token({ aal: "aal1" }))).toBe(false)
  })

  it("fails closed when the token has no readable aal", () => {
    expect(mfaRequirementMet(verified, token({}))).toBe(false)
    expect(mfaRequirementMet(verified, "not-a-jwt")).toBe(false)
    expect(mfaRequirementMet(verified, "")).toBe(false)
  })
})

describe("helpers", () => {
  it("reads the aal claim and verified factors", () => {
    expect(accessTokenAal(token({ aal: "aal2" }))).toBe("aal2")
    expect(accessTokenAal("a.%%%.c")).toBeNull()
    expect(hasVerifiedFactor(verified)).toBe(true)
    expect(hasVerifiedFactor(undefined)).toBe(false)
  })
})
