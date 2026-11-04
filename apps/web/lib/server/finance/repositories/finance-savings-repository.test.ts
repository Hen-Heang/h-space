import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => {
  const query = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    text: strings.join("?"),
    values,
  }))
  return { query, transaction: vi.fn() }
})
vi.mock("server-only", () => ({}))
vi.mock("@/lib/server/finance/db", () => ({
  sql: Object.assign(db.query, { transaction: db.transaction }),
}))
import { addContribution } from "./finance-savings-repository"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("savings contribution transaction", () => {
  it("submits the owned-goal insert and balance increment in one transaction", async () => {
    db.transaction.mockResolvedValueOnce([
      [
        {
          id: "contribution",
          goal_id: "goal",
          amount_usd: "12.50",
          contribution_month: "2026-11",
          created_at: "2026-11-04",
        },
      ],
      [],
    ])
    await expect(addContribution("goal", "owner", 12.5)).resolves.toMatchObject({
      amountUsd: 12.5,
      goalId: "goal",
    })
    expect(db.transaction).toHaveBeenCalledTimes(1)
    const [insert, update] = db.transaction.mock.calls[0][0]
    expect(insert.text).toMatch(
      /from finance_savings_goals\s+where id = \? and user_id = \?\s+for update/,
    )
    expect(insert.values).toContain("owner")
    expect(update.text).toMatch(/current_usd = current_usd \+ \?/)
    expect(update.values).toEqual([12.5, "goal", "owner"])
  })

  it("propagates a transaction failure without retrying a write outside the transaction", async () => {
    db.transaction.mockRejectedValueOnce(new Error("balance update failed"))
    await expect(addContribution("goal", "owner", 12.5)).rejects.toThrow("balance update failed")
    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(db.query).toHaveBeenCalledTimes(2)
  })

  it("returns not found when the goal is absent or belongs to someone else", async () => {
    db.transaction.mockResolvedValueOnce([[], []])
    await expect(addContribution("foreign-goal", "owner", 12.5)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    })
  })
})
