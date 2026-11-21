import { afterEach, describe, expect, it, vi } from "vitest"

const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  assertSupabaseConfigured: vi.fn(),
  supabase: { auth: { mfa } },
}))

import { mfaApi } from "./mfa"

function factors(list: Array<{ id: string; status: string }>) {
  mfa.listFactors.mockResolvedValueOnce({ data: { all: list, totp: list }, error: null })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("mfaApi.status", () => {
  it("is on only with a verified factor", async () => {
    factors([{ id: "f1", status: "verified" }])
    await expect(mfaApi.status()).resolves.toEqual({ enabled: true, factorId: "f1" })

    factors([{ id: "f2", status: "unverified" }])
    await expect(mfaApi.status()).resolves.toEqual({ enabled: false })
  })

  it("throws when the factors can't be read", async () => {
    mfa.listFactors.mockResolvedValueOnce({ data: null, error: new Error("offline") })
    await expect(mfaApi.status()).rejects.toThrow("offline")
  })
})

describe("mfaApi.startSetup", () => {
  it("removes abandoned factors, then enrolls a new TOTP factor", async () => {
    factors([
      { id: "stale", status: "unverified" },
      { id: "kept", status: "verified" },
    ])
    mfa.unenroll.mockResolvedValue({ error: null })
    mfa.enroll.mockResolvedValueOnce({
      data: {
        id: "new",
        totp: {
          secret: "ABCD",
          uri: "otpauth://totp/x",
          qr_code: "data:image/svg+xml;utf-8,<svg/>",
        },
      },
      error: null,
    })

    const setup = await mfaApi.startSetup()

    expect(mfa.unenroll).toHaveBeenCalledTimes(1)
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "stale" })
    expect(mfa.enroll).toHaveBeenCalledWith(expect.objectContaining({ factorType: "totp" }))
    expect(setup).toEqual({
      factorId: "new",
      secret: "ABCD",
      otpAuthUri: "otpauth://totp/x",
      qrCode: "data:image/svg+xml;utf-8,<svg/>",
    })
  })
})

describe("mfaApi.enable / disable", () => {
  it("enables with a verified code", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    await mfaApi.enable("f1", " 123456 ")
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "123456" })
  })

  it("won't remove the factor when the code is wrong", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({
      error: { code: "mfa_verification_failed", message: "Invalid TOTP code" },
    })
    await expect(mfaApi.disable("f1", "000000")).rejects.toMatchObject({
      code: "mfa_verification_failed",
    })
    expect(mfa.unenroll).not.toHaveBeenCalled()
  })

  it("verifies the code, then removes the factor", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    mfa.unenroll.mockResolvedValueOnce({ error: null })
    await mfaApi.disable("f1", "123456")
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "f1" })
  })
})
