import { afterEach, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ userId: "owner-a" as string | null, token: vi.fn() }))
vi.mock("@/lib/auth-store", () => ({
  getUserId: () => auth.userId,
  getSupabaseAccessToken: auth.token,
}))
import { apiFetch } from "./finance-client"

afterEach(() => {
  auth.userId = "owner-a"
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it("rejects an account switch while acquiring the token before making a request", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  auth.token.mockImplementation(async () => {
    auth.userId = "owner-b"
    return "synthetic-token"
  })
  await expect(apiFetch("/api/finance/savings")).rejects.toMatchObject({ code: "SESSION_CHANGED" })
  expect(fetch).not.toHaveBeenCalled()
})

it("discards an old account's response after a switch", async () => {
  auth.token.mockResolvedValue("synthetic-token")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      auth.userId = "owner-b"
      return Response.json({ data: [{ name: "Private synthetic goal" }] })
    }),
  )
  await expect(apiFetch("/api/finance/savings")).rejects.toMatchObject({ code: "SESSION_CHANGED" })
})

it("returns data when the requesting account stays signed in", async () => {
  auth.token.mockResolvedValue("synthetic-token")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ data: [] })),
  )
  await expect(apiFetch("/api/finance/savings")).resolves.toEqual([])
})
