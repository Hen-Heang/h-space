/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest"

const signOut = vi.hoisted(() => vi.fn())
const getSession = vi.hoisted(() => vi.fn())
const authListeners = vi.hoisted(() => [] as Array<() => void>)

vi.mock("@/lib/supabase", () => ({
  SUPABASE_STORAGE_KEY: "koriai-auth",
  supabase: {
    auth: {
      signOut,
      getSession,
      onAuthStateChange: (cb: () => void) => {
        authListeners.push(cb)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
    },
  },
}))

import {
  clearAuth,
  getSupabaseAccessToken,
  getUserEmail,
  getUserId,
  isAuthenticated,
  needsMfa,
  onAuthChange,
  requireUserId,
  tokenAal,
} from "./auth-store"

// Unsigned test tokens: only the payload matters to tokenAal().
function jwt(claims: Record<string, unknown>) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${encode({ alg: "HS256" })}.${encode(claims)}.signature`
}

function storeSession(opts: { aal?: string; factors?: Array<{ status: string }> } = {}) {
  window.localStorage.setItem(
    "koriai-auth",
    JSON.stringify({
      access_token: jwt({ sub: "user-1", aal: opts.aal ?? "aal1" }),
      refresh_token: "refresh",
      user: { id: "user-1", email: "a@example.com", factors: opts.factors ?? [] },
    }),
  )
}

afterEach(() => {
  window.localStorage.clear()
  signOut.mockReset()
  getSession.mockReset()
  authListeners.length = 0
})

describe("tokenAal", () => {
  it("reads the aal claim from a base64url payload", () => {
    expect(tokenAal(jwt({ aal: "aal2" }))).toBe("aal2")
    // ">>>???" encodes to "+" and "/" in base64, so "-" and "_" in base64url.
    expect(tokenAal(jwt({ aal: "aal1", name: ">>>???" }))).toBe("aal1")
  })

  it("returns null for missing or malformed tokens", () => {
    expect(tokenAal(null)).toBeNull()
    expect(tokenAal("not-a-jwt")).toBeNull()
    expect(tokenAal("a.!!!.c")).toBeNull()
    expect(tokenAal(jwt({ sub: "x" }))).toBeNull()
  })
})

describe("session reads", () => {
  it("is signed out with no stored session", () => {
    expect(isAuthenticated()).toBe(false)
    expect(getUserId()).toBeNull()
    expect(() => requireUserId()).toThrow("Not signed in")
  })

  it("is signed in with a session and no authenticator", () => {
    storeSession()
    expect(isAuthenticated()).toBe(true)
    expect(getUserId()).toBe("user-1")
    expect(getUserEmail()).toBe("a@example.com")
  })

  it("is not signed in while a verified authenticator's code is still owed", () => {
    storeSession({ aal: "aal1", factors: [{ status: "verified" }] })
    expect(needsMfa(JSON.parse(window.localStorage.getItem("koriai-auth")!))).toBe(true)
    expect(isAuthenticated()).toBe(false)
  })

  it("is signed in once that session is aal2", () => {
    storeSession({ aal: "aal2", factors: [{ status: "verified" }] })
    expect(isAuthenticated()).toBe(true)
  })

  it("ignores an unverified (abandoned) authenticator", () => {
    storeSession({ aal: "aal1", factors: [{ status: "unverified" }] })
    expect(isAuthenticated()).toBe(true)
  })

  it("treats unreadable storage as signed out", () => {
    window.localStorage.setItem("koriai-auth", "{not json")
    expect(isAuthenticated()).toBe(false)
  })
})

describe("getSupabaseAccessToken", () => {
  it("returns the session's token, or null when signed out", async () => {
    getSession.mockResolvedValueOnce({ data: { session: { access_token: "tok" } } })
    await expect(getSupabaseAccessToken()).resolves.toBe("tok")
    getSession.mockResolvedValueOnce({ data: { session: null } })
    await expect(getSupabaseAccessToken()).resolves.toBeNull()
  })
})

describe("clearAuth", () => {
  it("signs out this session only and forgets the Spring-era entry", async () => {
    window.localStorage.setItem("hspace-auth", "{}")
    signOut.mockResolvedValueOnce({ error: null })
    await clearAuth()
    expect(signOut).toHaveBeenCalledWith({ scope: "local" })
    expect(window.localStorage.getItem("hspace-auth")).toBeNull()
  })

  it("still forgets the session locally when Supabase can't be reached", async () => {
    storeSession()
    signOut.mockResolvedValueOnce({ error: new Error("offline") })
    await clearAuth()
    expect(window.localStorage.getItem("koriai-auth")).toBeNull()

    storeSession()
    signOut.mockRejectedValueOnce(new Error("offline"))
    await clearAuth()
    expect(window.localStorage.getItem("koriai-auth")).toBeNull()
  })

  it("notifies listeners", async () => {
    const callback = vi.fn()
    const off = onAuthChange(callback)
    signOut.mockResolvedValueOnce({ error: null })
    await clearAuth()
    expect(callback).toHaveBeenCalled()
    off()
  })
})

describe("onAuthChange", () => {
  it("fires for supabase-js auth events and other tabs' storage changes", () => {
    const callback = vi.fn()
    const off = onAuthChange(callback)
    authListeners.forEach((listener) => listener())
    window.dispatchEvent(new StorageEvent("storage", { key: "koriai-auth" }))
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }))
    expect(callback).toHaveBeenCalledTimes(2)
    off()
  })
})
