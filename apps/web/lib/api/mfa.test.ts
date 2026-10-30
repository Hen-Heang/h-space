/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { saveSession } from "@/lib/auth-store"

import { AuthApiError } from "./auth-http"
import { MFA_ALREADY_ENABLED, MFA_CODE_INVALID, mfaApi } from "./mfa"

const USER = { id: "user-1", email: "a@example.com", name: "A", imageUrl: null }

function envelope(data: unknown, init: { status?: number; code?: number; message?: string } = {}) {
  return new Response(
    JSON.stringify({
      status: { code: init.code ?? 200, message: init.message ?? "Success" },
      data,
    }),
    { status: init.status ?? 200, headers: { "Content-Type": "application/json" } },
  )
}

const fetchMock = vi.fn<typeof fetch>()

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!
  return {
    url: String(url),
    method: init?.method,
    auth: (init?.headers as Record<string, string>).Authorization,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  saveSession({ accessToken: "a1", refreshToken: "r1", expiresIn: 3600 }, USER)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("mfaApi", () => {
  it("starts setup with the session's bearer token", async () => {
    const setup = {
      secret: "JBSWY3DPEHPK3PXP",
      otpAuthUri: "otpauth://totp/x",
      qrCodeImageBase64: null,
    }
    fetchMock.mockResolvedValueOnce(envelope(setup))

    await expect(mfaApi.startSetup()).resolves.toEqual(setup)
    expect(lastRequest()).toMatchObject({
      method: "POST",
      auth: "Bearer a1",
    })
    expect(lastRequest().url).toMatch(/\/api\/auth\/mfa\/setup$/)
  })

  it("surfaces MFA_ALREADY_ENABLED so the page can show the enabled state", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, { status: 400, code: MFA_ALREADY_ENABLED, message: "already enabled" }),
    )

    const error = await mfaApi.startSetup().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AuthApiError)
    expect((error as AuthApiError).code).toBe(MFA_ALREADY_ENABLED)
  })

  it("enables with a trimmed code and returns the backup codes", async () => {
    fetchMock.mockResolvedValueOnce(envelope({ backupCodes: ["7K2NQ-8XPRT4", "M3VBH-2ZQWY9"] }))

    await expect(mfaApi.enable(" 123456 ")).resolves.toEqual(["7K2NQ-8XPRT4", "M3VBH-2ZQWY9"])
    expect(lastRequest().url).toMatch(/\/api\/auth\/mfa\/enable$/)
    expect(lastRequest().body).toEqual({ code: "123456" })
  })

  it("rejects a wrong code with MFA_CODE_INVALID", async () => {
    fetchMock.mockResolvedValueOnce(
      envelope(null, { status: 400, code: MFA_CODE_INVALID, message: "Invalid code" }),
    )

    const error = await mfaApi.enable("000000").catch((e: unknown) => e)
    expect((error as AuthApiError).code).toBe(MFA_CODE_INVALID)
  })

  it("disables and regenerates with the code in the body", async () => {
    fetchMock.mockResolvedValueOnce(envelope(null))
    await mfaApi.disable("7K2NQ-8XPRT4")
    expect(lastRequest().url).toMatch(/\/api\/auth\/mfa\/disable$/)
    expect(lastRequest().body).toEqual({ code: "7K2NQ-8XPRT4" })

    fetchMock.mockResolvedValueOnce(envelope({ backupCodes: ["NEW01-AAAAAA"] }))
    await expect(mfaApi.regenerateBackupCodes("123456")).resolves.toEqual(["NEW01-AAAAAA"])
    expect(lastRequest().url).toMatch(/\/api\/auth\/mfa\/backup-codes\/regenerate$/)
  })

  it("refuses without a session and never calls the API", async () => {
    window.localStorage.clear()

    const error = await mfaApi.startSetup().catch((e: unknown) => e)
    expect((error as AuthApiError).httpStatus).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
