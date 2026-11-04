import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Subscriptions + merchant names: every handler goes through
// requireFinanceUserId and passes only that id to the service.

vi.mock("server-only", () => ({}))
const requireFinanceUserId = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
}))
const subs = { listDetectedSubscriptions: vi.fn(), setSubscriptionStatus: vi.fn() }
vi.mock("@/lib/server/finance/services/finance-subscription-service", () => ({
  listDetectedSubscriptions: (...a: unknown[]) => subs.listDetectedSubscriptions(...a),
  setSubscriptionStatus: (...a: unknown[]) => subs.setSubscriptionStatus(...a),
}))
const names = { getMerchantNames: vi.fn(), mergeMerchants: vi.fn(), unmergeMerchants: vi.fn() }
vi.mock("@/lib/server/finance/services/finance-merchant-alias-service", () => ({
  getMerchantNames: (...a: unknown[]) => names.getMerchantNames(...a),
  mergeMerchants: (...a: unknown[]) => names.mergeMerchants(...a),
  unmergeMerchants: (...a: unknown[]) => names.unmergeMerchants(...a),
}))

import { Errors } from "@/lib/server/finance/errors"
import { GET as listSubs } from "./route"
import { PUT as setStatus } from "./[key]/route"
import { DELETE as unmerge, GET as listNames, POST as merge } from "../merchant-names/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const base = "http://localhost/api/finance"
const body = (method: string, b: unknown) => ({ method, body: JSON.stringify(b) })
const key = (k: string) => ({ params: Promise.resolve({ key: k }) })

afterEach(() => vi.resetAllMocks())

describe("subscriptions + merchant names — denial", () => {
  it("refuses every handler without a linked session and calls no service", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    const responses = await Promise.all([
      listSubs(new NextRequest(`${base}/subscriptions`)),
      setStatus(
        new NextRequest(
          `${base}/subscriptions/streaming`,
          body("PUT", { displayName: "x", status: "keep" }),
        ),
        key("streaming"),
      ),
      listNames(new NextRequest(`${base}/merchant-names`)),
      merge(new NextRequest(`${base}/merchant-names`, body("POST", { name: "x", keys: ["a"] }))),
      unmerge(new NextRequest(`${base}/merchant-names`, body("DELETE", { name: "x" }))),
    ])
    for (const response of responses) expect(response.status).toBe(401)
    for (const fn of [...Object.values(subs), ...Object.values(names)]) {
      expect(fn).not.toHaveBeenCalled()
    }
  })
})

describe("subscriptions + merchant names — scoping", () => {
  it("lists subscriptions for the linked id, ignoring a userId in the URL", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    subs.listDetectedSubscriptions.mockResolvedValue([])
    const response = await listSubs(new NextRequest(`${base}/subscriptions?userId=${OTHER}`))
    expect(response.status).toBe(200)
    expect(subs.listDetectedSubscriptions).toHaveBeenCalledWith(LINKED)
  })

  it("sets a status only for the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await setStatus(
      new NextRequest(
        `${base}/subscriptions/streaming`,
        body("PUT", { displayName: "Video streaming", status: "review", userId: OTHER }),
      ),
      key("streaming"),
    )
    expect(response.status).toBe(200)
    expect(subs.setSubscriptionStatus).toHaveBeenCalledWith(LINKED, "streaming", {
      displayName: "Video streaming",
      status: "review",
    })
  })

  it("rejects an unknown status with 422", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await setStatus(
      new NextRequest(
        `${base}/subscriptions/streaming`,
        body("PUT", { displayName: "x", status: "delete-everything" }),
      ),
      key("streaming"),
    )
    expect(response.status).toBe(422)
    expect(subs.setSubscriptionStatus).not.toHaveBeenCalled()
  })

  it("merges and unmerges merchant names only for the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    names.mergeMerchants.mockResolvedValue({ name: "Cafe" })
    await merge(
      new NextRequest(`${base}/merchant-names`, body("POST", { name: "Cafe", keys: ["cafe 1"] })),
    )
    await unmerge(new NextRequest(`${base}/merchant-names`, body("DELETE", { name: "Cafe" })))
    expect(names.mergeMerchants).toHaveBeenCalledWith(LINKED, "Cafe", ["cafe 1"])
    expect(names.unmergeMerchants).toHaveBeenCalledWith(LINKED, "Cafe")
  })

  it("rejects a merge with no keys", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await merge(
      new NextRequest(`${base}/merchant-names`, body("POST", { name: "Cafe", keys: [] })),
    )
    expect(response.status).toBe(422)
    expect(names.mergeMerchants).not.toHaveBeenCalled()
  })
})
