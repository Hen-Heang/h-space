import { describe, expect, it } from "vitest"

import {
  AdmissionError,
  ACCESS_DENIED_MESSAGE,
  ADMISSION_UNAVAILABLE_MESSAGE,
  HUB_MFA_REQUIRED_MESSAGE,
  HubApiError,
  httpOrigin,
  interpretAdmission,
  isAdmissionEnforced,
  isGitHubSignInEnabled,
  parseHubSession,
  pilotStateFor,
  resolveHubApiConfig,
  shouldClearUserCache,
  unwrapHubEnvelope,
} from "./auth-v2"

// Auth V2 test-plan ids in the names where a case maps to one. All values synthetic.

describe("switches are off unless set exactly", () => {
  it("admission is enforced only for 'enforce'", () => {
    expect(isAdmissionEnforced(undefined)).toBe(false)
    expect(isAdmissionEnforced("true")).toBe(false)
    expect(isAdmissionEnforced("ENFORCE")).toBe(false)
    expect(isAdmissionEnforced("enforce")).toBe(true)
  })

  it("GitHub sign-in only for 'true' (GH-10: off by default)", () => {
    expect(isGitHubSignInEnabled(undefined)).toBe(false)
    expect(isGitHubSignInEnabled("1")).toBe(false)
    expect(isGitHubSignInEnabled("true")).toBe(true)
  })

  it("the Spring Inbox pilot needs backend=spring AND a valid origin; never a silent fallback", () => {
    expect(resolveHubApiConfig(undefined, "https://api.example.invalid")).toEqual({
      enabled: false,
    })
    expect(resolveHubApiConfig("supabase", "https://api.example.invalid")).toEqual({
      enabled: false,
    })
    expect(resolveHubApiConfig("spring", "https://api.example.invalid/")).toEqual({
      enabled: true,
      baseUrl: "https://api.example.invalid",
    })
    expect(() => resolveHubApiConfig("spring", undefined)).toThrow(/NEXT_PUBLIC_AUTHV2_API_URL/)
    expect(() => resolveHubApiConfig("spring", "javascript:alert(1)")).toThrow()
  })

  it("httpOrigin refuses paths, credentials and non-http schemes", () => {
    expect(httpOrigin("http://localhost:8084")).toBe("http://localhost:8084")
    expect(httpOrigin("https://api.example.invalid/api")).toBeNull()
    expect(httpOrigin("https://user:pw@api.example.invalid")).toBeNull()
    expect(httpOrigin("ftp://api.example.invalid")).toBeNull()
    expect(httpOrigin("https://api.example.invalid?x=1")).toBeNull()
  })
})

describe("interpretAdmission fails closed", () => {
  it("ACC-01: exactly one approved row is approved", () => {
    expect(interpretAdmission([{ status: "approved" }], null)).toBe("approved")
  })
  it("ACC-02 / ACC-03: no row, suspended or unknown status is denied", () => {
    expect(interpretAdmission([], null)).toBe("denied")
    expect(interpretAdmission([{ status: "suspended" }], null)).toBe("denied")
    expect(interpretAdmission([{ status: "APPROVED" }], null)).toBe("denied")
  })
  it("ACC-06: an error or an unexpected shape is unavailable, never approved", () => {
    expect(interpretAdmission(null, { message: "timeout" })).toBe("unavailable")
    expect(interpretAdmission([{ status: "approved" }], { message: "x" })).toBe("unavailable")
    expect(interpretAdmission({ status: "approved" }, null)).toBe("unavailable")
    expect(interpretAdmission([{ status: "approved" }, { status: "approved" }], null)).toBe(
      "unavailable",
    )
    expect(interpretAdmission([{ status: 1 }], null)).toBe("unavailable")
  })
  it("AdmissionError carries the generic copy only", () => {
    expect(new AdmissionError("denied").message).toBe(ACCESS_DENIED_MESSAGE)
    expect(new AdmissionError("unavailable").message).toBe(ADMISSION_UNAVAILABLE_MESSAGE)
  })
})

describe("shouldClearUserCache (SES-04)", () => {
  it("clears on sign-out and on a different account, keeps on same-user refresh", () => {
    expect(shouldClearUserCache(undefined, "a")).toBe(false)
    expect(shouldClearUserCache("a", "a")).toBe(false)
    expect(shouldClearUserCache("a", null)).toBe(true)
    expect(shouldClearUserCache("a", "b")).toBe(true)
    expect(shouldClearUserCache(null, "b")).toBe(true)
  })
})

describe("unwrapHubEnvelope (INBOX-08, ISO-08)", () => {
  it("returns data for the 200 envelope, including create/delete's 200 (not 201/204)", () => {
    expect(
      unwrapHubEnvelope(200, { status: { code: 200, message: "Success" }, data: { id: "x" } }),
    ).toEqual({
      id: "x",
    })
    expect(unwrapHubEnvelope(200, { status: { code: 200 }, data: {} })).toEqual({})
  })

  it("maps statuses to kinds with fixed copy and keeps the request id", () => {
    const cases: Array<[number, string, string]> = [
      [401, "x", "unauthorized"],
      [403, "This account doesn't have access to H-Space.", "forbidden"],
      [403, HUB_MFA_REQUIRED_MESSAGE, "mfa_required"],
      [404, "Inbox item not found with id : 'x'", "not_found"],
      [503, "x", "unavailable"],
      [500, "org.postgresql.util.PSQLException: boom", "other"],
    ]
    for (const [status, message, kind] of cases) {
      try {
        unwrapHubEnvelope(status, { status: { code: status * 100, message, requestId: "req-1" } })
        throw new Error("should throw")
      } catch (error) {
        expect(error).toBeInstanceOf(HubApiError)
        const e = error as HubApiError
        expect(e.kind).toBe(kind)
        expect(e.requestId).toBe("req-1")
        expect(e.message).not.toContain("PSQLException")
      }
    }
  })

  it("keeps a validation message for 400 only", () => {
    expect(() =>
      unwrapHubEnvelope(400, { status: { code: 40000, message: "content must not be blank" } }),
    ).toThrow("content must not be blank")
  })

  it("a 2xx without the success envelope is not success", () => {
    expect(() => unwrapHubEnvelope(200, "<html>")).toThrow(HubApiError)
  })
})

describe("session probe → Inbox state", () => {
  const session = { userId: "u", aal: "aal2" as const, expiresAt: null, mfaRequiredForInbox: true }

  it("MFA-02: aal2 is ready; MFA-01: aal1 needs enrollment", () => {
    expect(pilotStateFor(session).kind).toBe("ready")
    expect(pilotStateFor({ ...session, aal: "aal1" }).kind).toBe("mfa_enrollment_required")
  })

  it("401 → expired, 403 → access denied, anything else → unavailable", () => {
    expect(pilotStateFor(new HubApiError("unauthorized", 401, "", null)).kind).toBe("expired")
    expect(pilotStateFor(new HubApiError("forbidden", 403, "", null)).kind).toBe("access_denied")
    expect(pilotStateFor(new HubApiError("unavailable", 503, "", null)).kind).toBe("unavailable")
    expect(pilotStateFor(new HubApiError("network", 0, "", null)).kind).toBe("unavailable")
  })

  it("parseHubSession never upgrades an unknown aal and rejects a malformed body", () => {
    expect(parseHubSession({ userId: "u", aal: "AAL2", mfaRequiredForInbox: true }).aal).toBe(
      "aal1",
    )
    expect(() => parseHubSession({ aal: "aal2" })).toThrow(HubApiError)
  })
})
