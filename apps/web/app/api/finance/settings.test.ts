import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// Finance Settings routes: categories, payment methods, preferences, reports,
// email/Telegram delivery and export. Every handler must authenticate first
// and hand services only the linked finance id (or that user's own row).

vi.mock("server-only", () => ({}))
const requireFinanceUserId = vi.fn()
const requireFinanceAppUser = vi.fn()
vi.mock("@/lib/server/finance/auth", () => ({
  requireFinanceUserId: (req: Request) => requireFinanceUserId(req),
  requireFinanceAppUser: (req: Request) => requireFinanceAppUser(req),
}))

// vi.mock factories are hoisted above everything else, so the shared mocks
// they reference must be created with vi.hoisted.
const { svc, forward } = vi.hoisted(() => {
  const svc = {
    listCategories: vi.fn(),
    addCategory: vi.fn(),
    editCategory: vi.fn(),
    removeCategory: vi.fn(),
    listPaymentMethods: vi.fn(),
    addPaymentMethod: vi.fn(),
    editPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(),
    getPreferences: vi.fn(),
    editPreferences: vi.fn(),
    exportTransactions: vi.fn(),
    getWeeklySummary: vi.fn(),
    getMonthlyReport: vi.fn(),
    sendWeeklySummaryEmail: vi.fn(),
    sendMonthlyReportEmail: vi.fn(),
    sendWeeklySummaryToTelegram: vi.fn(),
    sendMonthlyReportToTelegram: vi.fn(),
  }
  const forward =
    (name: keyof typeof svc) =>
    (...a: unknown[]) =>
      svc[name](...a)
  return { svc, forward }
})
vi.mock("@/lib/server/finance/services/finance-lookup-service", () => ({
  listCategories: forward("listCategories"),
  addCategory: forward("addCategory"),
  editCategory: forward("editCategory"),
  removeCategory: forward("removeCategory"),
  listPaymentMethods: forward("listPaymentMethods"),
  addPaymentMethod: forward("addPaymentMethod"),
  editPaymentMethod: forward("editPaymentMethod"),
  removePaymentMethod: forward("removePaymentMethod"),
}))
vi.mock("@/lib/server/finance/services/finance-preferences-service", () => ({
  getPreferences: forward("getPreferences"),
  editPreferences: forward("editPreferences"),
}))
vi.mock("@/lib/server/finance/services/finance-export-service", () => ({
  exportTransactions: forward("exportTransactions"),
}))
vi.mock("@/lib/server/finance/services/finance-report-service", () => ({
  getWeeklySummary: forward("getWeeklySummary"),
  getMonthlyReport: forward("getMonthlyReport"),
}))
vi.mock("@/lib/server/finance/services/finance-email-service", () => ({
  sendWeeklySummaryEmail: forward("sendWeeklySummaryEmail"),
  sendMonthlyReportEmail: forward("sendMonthlyReportEmail"),
}))
vi.mock("@/lib/server/finance/services/finance-telegram-service", () => ({
  sendWeeklySummaryToTelegram: forward("sendWeeklySummaryToTelegram"),
  sendMonthlyReportToTelegram: forward("sendMonthlyReportToTelegram"),
}))
vi.mock("@/lib/server/finance/email", () => ({ isEmailConfigured: () => false }))

import { Errors } from "@/lib/server/finance/errors"
import * as categories from "./categories/route"
import * as category from "./categories/[id]/route"
import * as methods from "./payment-methods/route"
import * as method from "./payment-methods/[id]/route"
import * as preferences from "./preferences/route"
import * as exportRoute from "./export/route"
import * as weekly from "./reports/weekly/route"
import * as monthly from "./reports/monthly/route"
import * as emailSend from "./email/send/route"
import * as emailStatus from "./email/status/route"
import * as telegramSend from "./telegram/send/route"

// Synthetic ids only.
const LINKED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const LINKED_USER = { id: LINKED, email: "owner@example.invalid" }

const base = "http://localhost/api/finance"
const req = (path: string, method = "GET", body?: unknown) =>
  new NextRequest(
    `${base}${path}`,
    body === undefined ? { method } : { method, body: JSON.stringify(body) },
  )
const params = (id: string) => ({ params: Promise.resolve({ id }) })

afterEach(() => vi.resetAllMocks())

describe("settings routes — denial", () => {
  it("refuses every handler without a linked session and calls no service", async () => {
    requireFinanceUserId.mockRejectedValue(Errors.unauthorized())
    requireFinanceAppUser.mockRejectedValue(Errors.unauthorized())
    const responses = await Promise.all([
      categories.GET(req("/categories")),
      categories.POST(req("/categories", "POST", { name: "x", type: "expense" })),
      category.PATCH(req(`/categories/${ID}`, "PATCH", { name: "y" }), params(ID)),
      category.DELETE(req(`/categories/${ID}`, "DELETE"), params(ID)),
      methods.GET(req("/payment-methods")),
      methods.POST(req("/payment-methods", "POST", { name: "x" })),
      method.PATCH(req(`/payment-methods/${ID}`, "PATCH", { name: "y" }), params(ID)),
      method.DELETE(req(`/payment-methods/${ID}`, "DELETE"), params(ID)),
      preferences.GET(req("/preferences")),
      preferences.PUT(req("/preferences", "PUT", { targetSavingsRate: 30 })),
      exportRoute.GET(req("/export?format=csv")),
      weekly.GET(req("/reports/weekly")),
      monthly.GET(req("/reports/monthly?month=2026-10")),
      emailSend.POST(req("/email/send", "POST", { type: "weekly" })),
      emailStatus.GET(req("/email/status")),
      telegramSend.POST(req("/telegram/send", "POST", { type: "weekly" })),
    ])
    responses.forEach((r) => expect(r.status).toBe(401))
    Object.values(svc).forEach((fn) => expect(fn).not.toHaveBeenCalled())
  })
})

describe("settings routes — scoping", () => {
  it("edits and deletes categories only through the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    svc.editCategory.mockResolvedValue({ id: ID })
    await category.PATCH(
      req(`/categories/${ID}?userId=${OTHER}`, "PATCH", { name: "Food" }),
      params(ID),
    )
    await category.DELETE(req(`/categories/${ID}`, "DELETE"), params(ID))
    expect(svc.editCategory.mock.calls[0]?.[0]).toBe(LINKED)
    expect(svc.editCategory.mock.calls[0]?.[1]).toBe(ID)
    expect(svc.removeCategory).toHaveBeenCalledWith(LINKED, ID)
  })

  it("edits and deletes payment methods only through the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    svc.editPaymentMethod.mockResolvedValue({ id: ID })
    await method.PATCH(req(`/payment-methods/${ID}`, "PATCH", { name: "Card" }), params(ID))
    await method.DELETE(req(`/payment-methods/${ID}`, "DELETE"), params(ID))
    expect(svc.editPaymentMethod.mock.calls[0]?.[0]).toBe(LINKED)
    expect(svc.removePaymentMethod).toHaveBeenCalledWith(LINKED, ID)
  })

  it("rejects an out-of-range preference with 422 before saving", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    const response = await preferences.PUT(req("/preferences", "PUT", { targetSavingsRate: 250 }))
    expect(response.status).toBe(422)
    expect(svc.editPreferences).not.toHaveBeenCalled()
  })

  it("exports only the linked user's transactions as a CSV download", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    svc.exportTransactions.mockResolvedValue([])
    const response = await exportRoute.GET(req("/export?format=csv"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toMatch(/text\/csv/)
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename=".+\.csv"/)
    expect(svc.exportTransactions).toHaveBeenCalledWith(LINKED)
  })

  it("emails the report to the linked user's own address", async () => {
    requireFinanceAppUser.mockResolvedValue(LINKED_USER)
    svc.sendWeeklySummaryEmail.mockResolvedValue({ status: "sent" })
    const response = await emailSend.POST(
      req("/email/send", "POST", { type: "weekly", to: "attacker@example.invalid" }),
    )
    expect(response.status).toBe(200)
    expect(svc.sendWeeklySummaryEmail).toHaveBeenCalledWith(LINKED, LINKED_USER.email)
  })

  it("requires a month for a monthly email", async () => {
    requireFinanceAppUser.mockResolvedValue(LINKED_USER)
    const response = await emailSend.POST(req("/email/send", "POST", { type: "monthly" }))
    expect(response.status).toBe(422)
    expect(svc.sendMonthlyReportEmail).not.toHaveBeenCalled()
  })

  it("sends Telegram reports only for the linked id", async () => {
    requireFinanceUserId.mockResolvedValue(LINKED)
    svc.sendWeeklySummaryToTelegram.mockResolvedValue({ status: "sent" })
    await telegramSend.POST(req("/telegram/send", "POST", { type: "weekly" }))
    expect(svc.sendWeeklySummaryToTelegram).toHaveBeenCalledWith(LINKED)
  })
})
