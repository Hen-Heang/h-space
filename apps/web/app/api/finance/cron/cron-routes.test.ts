import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Every scheduled finance job is a public URL that sends messages and writes
// state, so each must refuse anything but Vercel Cron's CRON_SECRET bearer.

vi.mock("server-only", () => ({}))
const { runners } = vi.hoisted(() => ({
  runners: {
    runBudgetAlerts: vi.fn(),
    runSpendingSpike: vi.fn(),
    runDailyReminder: vi.fn(),
    runDailyLogReminder: vi.fn(),
    runWeeklySummaries: vi.fn(),
    runMonthlyReports: vi.fn(),
  },
}))
vi.mock("@/lib/server/finance/services/finance-alert-service", () => ({
  runBudgetAlerts: (...a: unknown[]) => runners.runBudgetAlerts(...a),
  runSpendingSpike: (...a: unknown[]) => runners.runSpendingSpike(...a),
  runDailyReminder: (...a: unknown[]) => runners.runDailyReminder(...a),
  runDailyLogReminder: (...a: unknown[]) => runners.runDailyLogReminder(...a),
}))
vi.mock("@/lib/server/finance/services/finance-report-schedule-service", () => ({
  runWeeklySummaries: (...a: unknown[]) => runners.runWeeklySummaries(...a),
  runMonthlyReports: (...a: unknown[]) => runners.runMonthlyReports(...a),
}))

import { GET as budgetAlerts } from "./budget-alerts/route"
import { GET as spendingSpike } from "./spending-spike/route"
import { GET as dailyReminder } from "./daily-reminder/route"
import { GET as dailyLogReminder } from "./daily-log-reminder/route"
import { GET as weeklySummary } from "./weekly-summary/route"
import { GET as monthlyReport } from "./monthly-report/route"

const SECRET = "synthetic-cron-secret-for-tests"
const JOBS = [
  ["budget-alerts", budgetAlerts, runners.runBudgetAlerts],
  ["spending-spike", spendingSpike, runners.runSpendingSpike],
  ["daily-reminder", dailyReminder, runners.runDailyReminder],
  ["daily-log-reminder", dailyLogReminder, runners.runDailyLogReminder],
  ["weekly-summary", weeklySummary, runners.runWeeklySummaries],
  ["monthly-report", monthlyReport, runners.runMonthlyReports],
] as const

const call = (job: string, handler: (r: NextRequest) => Promise<Response>, auth?: string) =>
  handler(
    new NextRequest(`http://localhost/api/finance/cron/${job}`, {
      headers: auth ? { authorization: auth } : {},
    }),
  )

beforeEach(() => vi.stubEnv("CRON_SECRET", SECRET))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

describe.each(JOBS)("GET /api/finance/cron/%s", (job, handler, runner) => {
  it("runs for the scheduler", async () => {
    runner.mockResolvedValue({ scanned: 1, notified: 0 })
    const response = await call(job, handler, `Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(runner).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["no header", undefined],
    ["wrong secret", "Bearer not-the-secret"],
    ["a user's session token", "Bearer eyJhbGciOiJIUzI1NiJ9.synthetic.token"],
  ])("rejects %s with 401 and does nothing", async (_label, auth) => {
    const response = await call(job, handler, auth)
    expect(response.status).toBe(401)
    expect(runner).not.toHaveBeenCalled()
  })

  it("fails closed with 503 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const response = await call(job, handler, `Bearer ${SECRET}`)
    expect(response.status).toBe(503)
    expect(runner).not.toHaveBeenCalled()
  })
})
