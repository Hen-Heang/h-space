import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Synthetic values only.
vi.mock("@/lib/supabase", () => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_KEY: "test-publishable-key",
  assertSupabaseConfigured: () => {},
}))
const getSupabaseAccessToken = vi.fn<() => Promise<string | null>>()
vi.mock("@/lib/auth-store", () => ({
  getSupabaseAccessToken: () => getSupabaseAccessToken(),
}))

import {
  decideConsent,
  getConsentAuthorization,
  isConsentRedirect,
  safeConsentRedirect,
} from "./mcp-consent"

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  getSupabaseAccessToken.mockResolvedValue("synthetic-bridge-token")
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  getSupabaseAccessToken.mockReset()
})

describe("getConsentAuthorization", () => {
  it("GETs the authorization with the bridge token and publishable key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { authorization_id: "abc123", client: { name: "Test Client" } }),
    )
    const result = await getConsentAuthorization("abc123")

    expect(result.error).toBeNull()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://example.supabase.co/auth/v1/oauth/authorizations/abc123")
    expect(init?.method).toBe("GET")
    expect(init?.headers).toMatchObject({
      apikey: "test-publishable-key",
      Authorization: "Bearer synthetic-bridge-token",
    })
    expect(init?.credentials).toBe("omit")
  })

  it("rejects ids that could alter the request path, without a request", async () => {
    for (const id of ["../consent", "a/b", "abc?x=1", "", "a b"]) {
      const result = await getConsentAuthorization(id)
      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks the user to sign in when there is no bridge token, without a request", async () => {
    getSupabaseAccessToken.mockResolvedValue(null)
    const result = await getConsentAuthorization("abc123")
    expect(result.error).toMatch(/sign in/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([401, 403])("maps %s to the signed-out message", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { msg: "authentication required" }))
    const result = await getConsentAuthorization("abc123")
    expect(result.error).toMatch(/sign in/i)
  })

  it("surfaces the server's short message for other failures", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { msg: "authorization not found" }))
    const result = await getConsentAuthorization("abc123")
    expect(result).toEqual({ data: null, error: "authorization not found" })
  })

  it("falls back to a generic message for a non-JSON failure", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 500 }))
    const result = await getConsentAuthorization("abc123")
    expect(result.error).toMatch(/couldn't be loaded/)
  })

  it("reports a network failure without throwing", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    const result = await getConsentAuthorization("abc123")
    expect(result.error).toMatch(/connection/)
  })
})

describe("decideConsent", () => {
  it.each(["approve", "deny"] as const)(
    "POSTs action=%s to the consent endpoint",
    async (action) => {
      fetchMock.mockResolvedValue(jsonResponse(200, { redirect_url: "https://client.example/cb" }))
      const result = await decideConsent("abc123", action)

      expect(result).toEqual({ data: { redirect_url: "https://client.example/cb" }, error: null })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://example.supabase.co/auth/v1/oauth/authorizations/abc123/consent")
      expect(init?.method).toBe("POST")
      expect(JSON.parse(String(init?.body))).toEqual({ action })
    },
  )
})

describe("isConsentRedirect", () => {
  it("tells details from an already-decided redirect", () => {
    expect(isConsentRedirect({ redirect_url: "https://client.example/cb" })).toBe(true)
    expect(isConsentRedirect({ authorization_id: "abc123", client: {} })).toBe(false)
  })
})

describe("safeConsentRedirect", () => {
  it("allows http(s) callbacks, including loopback for desktop clients", () => {
    expect(safeConsentRedirect("https://client.example/cb?code=x")).toBe(
      "https://client.example/cb?code=x",
    )
    expect(safeConsentRedirect("http://localhost:33418/callback")).toBe(
      "http://localhost:33418/callback",
    )
  })

  it("refuses script and relative URLs", () => {
    expect(safeConsentRedirect("javascript:alert(1)")).toBeNull()
    expect(safeConsentRedirect("data:text/html,x")).toBeNull()
    expect(safeConsentRedirect("/home")).toBeNull()
  })
})
