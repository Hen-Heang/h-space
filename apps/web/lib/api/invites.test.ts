/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { saveSession } from "@/lib/auth-store"

import { accountApi, invitesApi, isAdmin } from "./invites"

const fetchMock = vi.fn<typeof fetch>()

function ok(data: unknown) {
  return new Response(JSON.stringify({ status: { code: 200, message: "Success" }, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  saveSession(
    { accessToken: "a1", refreshToken: "r1", expiresIn: 3600 },
    { id: "user-1", email: "owner@example.com", name: null, imageUrl: null },
  )
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("isAdmin", () => {
  it("is true only with ROLE_ADMIN", () => {
    expect(isAdmin({ roles: ["ROLE_ADMIN", "ROLE_USER"] })).toBe(true)
    expect(isAdmin({ roles: ["ROLE_USER"] })).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe("accountApi.current", () => {
  it("treats a missing roles list as no roles", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "user-1", email: "owner@example.com" }))

    const account = await accountApi.current()

    expect(account.roles).toEqual([])
    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer a1")
  })
})

describe("invitesApi", () => {
  it("creates an invite with a trimmed email", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "inv-1", email: "friend@example.com" }))

    await invitesApi.create("  friend@example.com ")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/admin\/invites$/)
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ email: "friend@example.com" })
  })

  it("revokes by id with DELETE", async () => {
    fetchMock.mockResolvedValueOnce(ok(null))

    await invitesApi.revoke("inv-1")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/admin\/invites\/inv-1$/)
    expect(init?.method).toBe("DELETE")
  })

  it("refuses to call the API when signed out", async () => {
    window.localStorage.clear()

    await expect(invitesApi.list()).rejects.toThrow("Not signed in")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
