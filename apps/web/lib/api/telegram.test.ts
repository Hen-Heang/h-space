import { afterEach, describe, expect, it, vi } from "vitest"

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/api/finance-client", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }))

import { getTelegramLinkStatus, linkFinanceTelegram, stopFinanceTelegram } from "./telegram"

afterEach(() => apiFetch.mockReset())

// Regression: the client used Luyra's /api/telegram/link, which 404s in
// H-Space, so Finance always looked "not linked" and hid "Send to Telegram".
describe("finance Telegram client", () => {
  it("reads status from H-Space's finance route", async () => {
    await getTelegramLinkStatus()
    expect(apiFetch).toHaveBeenCalledWith("/api/finance/telegram/link")
  })

  it("links and stops through the same route", async () => {
    await linkFinanceTelegram()
    await stopFinanceTelegram()
    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/finance/telegram/link", { method: "POST" })
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/finance/telegram/link", {
      method: "DELETE",
    })
  })

  it("never calls Luyra's old route", async () => {
    await getTelegramLinkStatus()
    await linkFinanceTelegram()
    await stopFinanceTelegram()
    for (const [path] of apiFetch.mock.calls) expect(path).not.toBe("/api/telegram/link")
  })
})
