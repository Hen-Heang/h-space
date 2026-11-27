import { describe, expect, it, vi } from "vitest"

import { HubApiError } from "@/lib/auth-v2"
import { hubRequest, hubSessionApi } from "./hub-http"
import { createInboxHttpStore, listPath, patchBody } from "./inbox-http"

// The Spring Inbox adapter against a fake fetch: request shape, bearer-only
// auth, the 200 envelopes, PATCH null-vs-absent, and error mapping. Synthetic data.

const BASE = "https://api.example.invalid"
const TOKEN = "synthetic.access.token"

const ITEM = {
  id: "0b0e5c2a-7d3c-4c8e-9a51-2f6d8e4b1a01",
  title: null,
  content: "Synthetic capture",
  itemType: "idea",
  tags: ["pilot"],
  capturedAt: "2026-11-27T01:00:00Z",
  eventAt: null,
  goalId: null,
  status: "inbox",
  source: "manual",
  pinned: false,
  convertedToType: null,
  convertedToId: null,
  createdAt: "2026-11-27T01:00:00Z",
  updatedAt: "2026-11-27T01:00:00Z",
}

function envelope(data: unknown, code = 200, message = "Success") {
  return { status: { code, message }, data }
}

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

function storeWith(fetchImpl: ReturnType<typeof fakeFetch>) {
  return createInboxHttpStore((request) =>
    hubRequest(request, {
      fetch: fetchImpl as unknown as typeof fetch,
      token: async () => TOKEN,
      baseUrl: BASE,
    }),
  )
}

describe("hubRequest", () => {
  it("ISO-07: sends the bearer token, never cookies, no redirects", async () => {
    const fetchImpl = fakeFetch(200, envelope(null))
    await hubRequest(
      { path: "/api/hub/session" },
      { fetch: fetchImpl as unknown as typeof fetch, token: async () => TOKEN, baseUrl: BASE },
    )
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${BASE}/api/hub/session`)
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
    expect(init.credentials).toBe("omit")
    expect(init.redirect).toBe("error")
  })

  it("no session → unauthorized without a request", async () => {
    const fetchImpl = fakeFetch(200, envelope(null))
    await expect(
      hubRequest(
        { path: "/x" },
        { fetch: fetchImpl as unknown as typeof fetch, token: async () => null, baseUrl: BASE },
      ),
    ).rejects.toMatchObject({ kind: "unauthorized" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("network failure → network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    })
    await expect(
      hubRequest(
        { path: "/x" },
        { fetch: fetchImpl as unknown as typeof fetch, token: async () => TOKEN, baseUrl: BASE },
      ),
    ).rejects.toMatchObject({ kind: "network" })
  })

  it("ACC-08: session probe parses the summary", async () => {
    const fetchImpl = fakeFetch(
      200,
      envelope({ userId: "u", aal: "aal1", expiresAt: null, mfaRequiredForInbox: true }),
    )
    const session = await hubSessionApi.get({
      fetch: fetchImpl as unknown as typeof fetch,
      token: async () => TOKEN,
      baseUrl: BASE,
    })
    expect(session).toEqual({
      userId: "u",
      aal: "aal1",
      expiresAt: null,
      mfaRequiredForInbox: true,
    })
  })
})

describe("Inbox HTTP store", () => {
  it("INBOX-01: list sends filters and the bounded limit", () => {
    expect(listPath({})).toBe("/api/hub/inbox-items?limit=500")
    expect(listPath({ status: "all", itemType: "idea", limit: 20 })).toBe(
      "/api/hub/inbox-items?itemType=idea&limit=20",
    )
  })

  it("INBOX-02 / INBOX-08: create posts the Supabase store's defaults and reads the 200 envelope", async () => {
    const fetchImpl = fakeFetch(200, envelope(ITEM))
    const created = await storeWith(fetchImpl).create({
      content: "  Synthetic capture ",
      itemType: "idea",
      tags: ["pilot"],
    })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({
      title: null,
      content: "Synthetic capture",
      itemType: "idea",
      tags: ["pilot"],
      eventAt: null,
      goalId: null,
      source: "manual",
    })
    expect(created).toEqual(ITEM)
  })

  it("INBOX-03: PATCH sends only present keys; null clears, undefined is absent", async () => {
    expect(patchBody({ title: null, pinned: true, content: undefined })).toEqual({
      title: null,
      pinned: true,
    })
    const fetchImpl = fakeFetch(200, envelope({ ...ITEM, pinned: true }))
    await storeWith(fetchImpl).update(ITEM.id, { pinned: true, eventAt: null })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${BASE}/api/hub/inbox-items/${ITEM.id}`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body as string)).toEqual({ pinned: true, eventAt: null })
  })

  it("INBOX-08: delete accepts the 200 envelope with an empty object", async () => {
    const fetchImpl = fakeFetch(200, envelope({}))
    await expect(storeWith(fetchImpl).remove(ITEM.id)).resolves.toBeUndefined()
  })

  it("INBOX-06: markConverted is additive (status processed + reference), never a delete", async () => {
    const fetchImpl = fakeFetch(200, envelope(ITEM))
    await storeWith(fetchImpl).markConverted(ITEM.id, "task", "task-1")
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body as string)).toEqual({
      convertedToType: "task",
      convertedToId: "task-1",
      status: "processed",
    })
  })

  it("INBOX-04 / MFA-01: 404 and the MFA 403 surface as typed errors", async () => {
    await expect(
      storeWith(fakeFetch(404, envelope("x", 40400, "Inbox item not found"))).get(ITEM.id),
    ).rejects.toMatchObject({ kind: "not_found" })
    const mfa = await storeWith(
      fakeFetch(
        403,
        envelope("x", 40300, "This needs a session verified with your authenticator code."),
      ),
    )
      .list({})
      .catch((e) => e)
    expect(mfa).toBeInstanceOf(HubApiError)
    expect(mfa.kind).toBe("mfa_required")
  })

  it("ids are path-encoded", async () => {
    const fetchImpl = fakeFetch(200, envelope(ITEM))
    await storeWith(fetchImpl).get("../admin")
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe(
      `${BASE}/api/hub/inbox-items/..%2Fadmin`,
    )
  })
})
