import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { accessTokenAal, hasVerifiedFactor, latestTotpAt, mfaRequirementMet } from "./session-mfa"

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

describe("latestTotpAt", () => {
  it("returns the newest authenticator-code time from amr", () => {
    const amr = [
      { method: "password", timestamp: 100 },
      { method: "totp", timestamp: 200 },
      { method: "mfa/totp", timestamp: 300 },
      { method: "otp", timestamp: 400 },
    ]
    expect(latestTotpAt(token({ amr }))).toBe(300)
  })

  it("is null without a usable TOTP entry", () => {
    expect(latestTotpAt(token({}))).toBeNull()
    expect(latestTotpAt(token({ amr: [{ method: "password", timestamp: 100 }] }))).toBeNull()
    expect(latestTotpAt(token({ amr: [{ method: "totp" }] }))).toBeNull()
    expect(latestTotpAt(token({ amr: [{ method: "totp", timestamp: "200" }] }))).toBeNull()
    expect(latestTotpAt(token({ amr: "totp" }))).toBeNull()
    expect(latestTotpAt("not-a-jwt")).toBeNull()
  })

  it("is null for the timestamp-less RFC 8176 form, so freshness can't be claimed", () => {
    expect(latestTotpAt(token({ amr: ["password", "totp"] }))).toBeNull()
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
