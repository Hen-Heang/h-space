import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Finance Telegram follows the user's H-Space link (one shared bot). The
// H-Space link is read with the caller's own RLS client; the copy goes into
// Neon for the linked finance user only; chat ids never reach the browser.

vi.mock("server-only", () => ({}))
const { requireFinanceSession, repo, hspace } = vi.hoisted(() => ({
  requireFinanceSession: vi.fn(),
  repo: { findAccountByUserId: vi.fn(), setChatForUser: vi.fn(), unlinkAccount: vi.fn() },
  hspace: { chatId: null as string | null, error: null as { message: string } | null },
}))
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceSession: (req: Request) => requireFinanceSession(req),
}))
vi.mock("@/lib/server/finance/repositories/telegram-account-repository", () => ({
  findAccountByUserId: (...a: unknown[]) => repo.findAccountByUserId(...a),
  setChatForUser: (...a: unknown[]) => repo.setChatForUser(...a),
  unlinkAccount: (...a: unknown[]) => repo.unlinkAccount(...a),
}))
vi.mock("@/lib/server/finance/telegram", () => ({ isTelegramConfigured: () => true }))

import { Errors } from "@/lib/server/finance/errors"
import { DELETE, GET, POST } from "./route"

// Synthetic ids only.
const FINANCE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const HSPACE = "11111111-1111-4111-8111-111111111111"
const CHAT = "100200300"

// A minimal stand-in for the RLS-scoped Supabase client.
const eqCalls: [string, string][] = []
const db = {
  from: (table: string) => {
    expect(table).toBe("kori_telegram_links")
    return {
      select: () => ({
        eq: (col: string, val: string) => {
          eqCalls.push([col, val])
          return {
            maybeSingle: async () => ({
              data: hspace.chatId ? { chat_id: hspace.chatId } : null,
              error: hspace.error,
            }),
          }
        },
      }),
    }
  },
}

const req = (method = "GET") =>
  new NextRequest("http://localhost/api/finance/telegram/link", { method })
const session = () =>
  requireFinanceSession.mockResolvedValue({ financeUserId: FINANCE, hspaceUserId: HSPACE, db })

afterEach(() => {
  vi.resetAllMocks()
  hspace.chatId = null
  hspace.error = null
  eqCalls.length = 0
})

describe("finance Telegram link", () => {
  it("refuses every method without a linked session", async () => {
    requireFinanceSession.mockRejectedValue(Errors.unauthorized())
    for (const handler of [GET, POST, DELETE]) {
      expect((await handler(req())).status).toBe(401)
    }
    expect(repo.setChatForUser).not.toHaveBeenCalled()
    expect(repo.unlinkAccount).not.toHaveBeenCalled()
  })

  it("reports status without exposing the chat id", async () => {
    session()
    hspace.chatId = CHAT
    repo.findAccountByUserId.mockResolvedValue({ chatId: CHAT })
    const response = await GET(req())
    const body = await response.json()
    expect(body.data).toEqual({ configured: true, linked: true, hspaceLinked: true, inSync: true })
    expect(JSON.stringify(body)).not.toContain(CHAT)
    expect(repo.findAccountByUserId).toHaveBeenCalledWith(FINANCE)
    expect(eqCalls).toContainEqual(["user_id", HSPACE])
  })

  it("copies the caller's own H-Space chat to their finance account", async () => {
    session()
    hspace.chatId = CHAT
    repo.findAccountByUserId.mockResolvedValue({ chatId: CHAT })
    const response = await POST(req("POST"))
    expect(response.status).toBe(200)
    expect(repo.setChatForUser).toHaveBeenCalledWith(FINANCE, CHAT)
  })

  it("refuses with 409 when H-Space has no Telegram link, writing nothing", async () => {
    session()
    const response = await POST(req("POST"))
    expect(response.status).toBe(409)
    expect(repo.setChatForUser).not.toHaveBeenCalled()
  })

  it("fails without writing when the H-Space link can't be read", async () => {
    session()
    hspace.error = { message: "permission denied" }
    const response = await POST(req("POST"))
    expect(response.status).toBe(500)
    expect(repo.setChatForUser).not.toHaveBeenCalled()
  })

  it("stops finance messages for the linked finance user only", async () => {
    session()
    repo.findAccountByUserId.mockResolvedValue(null)
    const response = await DELETE(req("DELETE"))
    expect(response.status).toBe(200)
    expect(repo.unlinkAccount).toHaveBeenCalledWith(FINANCE)
  })
})
