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

import { deviceName, mfaApi, newDeviceName, type MfaDevice } from "./mfa"

interface FakeFactor {
  id: string
  status: string
  friendly_name?: string
  created_at: string
}

function factors(list: FakeFactor[]) {
  mfa.listFactors.mockResolvedValueOnce({
    data: { all: list, totp: list.filter((f) => f.status === "verified") },
    error: null,
  })
}

const device = (name: string): MfaDevice => ({ factorId: name, name, createdAt: "" })

afterEach(() => {
  vi.clearAllMocks()
})

describe("mfaApi.devices", () => {
  it("lists verified authenticators oldest first, with names", async () => {
    factors([
      { id: "b", status: "verified", friendly_name: "iPad", created_at: "2026-11-22T00:00:00Z" },
      { id: "x", status: "unverified", friendly_name: "half", created_at: "2026-11-23T00:00:00Z" },
      { id: "a", status: "verified", friendly_name: "", created_at: "2026-11-21T00:00:00Z" },
    ])
    await expect(mfaApi.devices()).resolves.toEqual([
      { factorId: "a", name: "Authenticator 1", createdAt: "2026-11-21T00:00:00Z" },
      { factorId: "b", name: "iPad", createdAt: "2026-11-22T00:00:00Z" },
    ])
  })

  it("is empty when two-step verification is off", async () => {
    factors([])
    await expect(mfaApi.devices()).resolves.toEqual([])
  })

  it("throws when the factors can't be read", async () => {
    mfa.listFactors.mockResolvedValueOnce({ data: null, error: new Error("offline") })
    await expect(mfaApi.devices()).rejects.toThrow("offline")
  })
})

describe("device names", () => {
  it("falls back to a numbered name", () => {
    expect(deviceName("  iPhone ", 0)).toBe("iPhone")
    expect(deviceName(undefined, 1)).toBe("Authenticator 2")
  })

  it("uses the typed name, trimmed and capped", () => {
    expect(newDeviceName("  iPad  ", [])).toBe("iPad")
    expect(newDeviceName("x".repeat(60), [])).toHaveLength(40)
  })

  it("picks a default that doesn't clash with an existing name", () => {
    expect(newDeviceName("", [])).toBe("Authenticator 1")
    expect(newDeviceName(" ", [device("Authenticator 2")])).toBe("Authenticator 3")
    expect(newDeviceName("", [device("iPhone")])).toBe("Authenticator 2")
  })
})

describe("mfaApi.startSetup", () => {
  it("removes abandoned factors, keeps linked ones, and enrolls with the name", async () => {
    factors([
      { id: "stale", status: "unverified", created_at: "2026-11-20T00:00:00Z" },
      { id: "kept", status: "verified", created_at: "2026-11-19T00:00:00Z" },
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

    const setup = await mfaApi.startSetup("iPad")

    expect(mfa.unenroll).toHaveBeenCalledTimes(1)
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "stale" })
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "iPad" })
    expect(setup).toEqual({
      factorId: "new",
      secret: "ABCD",
      otpAuthUri: "otpauth://totp/x",
      qrCode: "data:image/svg+xml;utf-8,<svg/>",
    })
  })

  it("reports a name already in use", async () => {
    factors([])
    mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: { code: "mfa_factor_name_conflict", message: "name taken" },
    })
    await expect(mfaApi.startSetup("iPhone")).rejects.toMatchObject({
      code: "mfa_factor_name_conflict",
    })
  })
})

describe("mfaApi.confirm", () => {
  it("links the new authenticator with its own code", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    await mfaApi.confirm("new", " 123456 ")
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "new", code: "123456" })
  })
})

describe("mfaApi.remove", () => {
  it("removes a lost device with a code from the backup", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    mfa.unenroll.mockResolvedValueOnce({ error: null })

    await mfaApi.remove("lost-phone", "backup", "123456")

    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "backup", code: "123456" })
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "lost-phone" })
  })

  it("won't remove anything when the code is wrong", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({
      error: { code: "mfa_verification_failed", message: "Invalid TOTP code" },
    })
    await expect(mfaApi.remove("f1", "f2", "000000")).rejects.toMatchObject({
      code: "mfa_verification_failed",
    })
    expect(mfa.unenroll).not.toHaveBeenCalled()
  })

  it("surfaces a refused removal", async () => {
    mfa.challengeAndVerify.mockResolvedValueOnce({ error: null })
    mfa.unenroll.mockResolvedValueOnce({ error: new Error("AAL2 required") })
    await expect(mfaApi.remove("f1", "f1", "123456")).rejects.toThrow("AAL2 required")
  })
})
