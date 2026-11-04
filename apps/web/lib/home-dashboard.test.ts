import { describe, expect, it } from "vitest"

import type { Goal } from "@/lib/goals"
import {
  goalTaskProgress,
  resolveRecentDestinations,
  selectActiveGoals,
} from "@/lib/home-dashboard"

const goal = (overrides: Partial<Goal>): Goal =>
  ({
    id: "g",
    title: "Goal",
    description: "",
    target_date: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    metadata: {},
    user_id: "u",
    outcome_progress: 0,
    health_status: "not_started",
    ...overrides,
  }) as Goal

describe("selectActiveGoals", () => {
  it("drops completed and archived goals", () => {
    const result = selectActiveGoals([
      goal({ id: "a" }),
      goal({ id: "b", status: "completed" }),
      goal({ id: "c", status: "archived" }),
    ])
    expect(result.map((g) => g.id)).toEqual(["a"])
  })

  it("orders starred first, then nearest target date, undated last", () => {
    const result = selectActiveGoals(
      [
        goal({ id: "undated" }),
        goal({ id: "later", target_date: "2026-12-01" }),
        goal({ id: "sooner", target_date: "2026-11-01" }),
        goal({ id: "starred", isStarred: true }),
      ],
      4,
    )
    expect(result.map((g) => g.id)).toEqual(["starred", "sooner", "later", "undated"])
  })

  it("breaks ties by newest created and respects the limit", () => {
    const result = selectActiveGoals(
      [
        goal({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
        goal({ id: "new", created_at: "2026-06-01T00:00:00Z" }),
      ],
      1,
    )
    expect(result.map((g) => g.id)).toEqual(["new"])
  })
})

describe("goalTaskProgress", () => {
  it("returns null without tasks", () => {
    expect(goalTaskProgress(goal({}))).toBeNull()
    expect(
      goalTaskProgress(goal({ taskCounts: { total: 0, completed: 0, incomplete: 0 } })),
    ).toBeNull()
  })

  it("rounds the completion percentage", () => {
    expect(
      goalTaskProgress(goal({ taskCounts: { total: 3, completed: 1, incomplete: 2 } })),
    ).toEqual({ completed: 1, total: 3, pct: 33 })
  })
})

describe("resolveRecentDestinations", () => {
  const items = new Map(["a", "b", "c", "d"].map((id) => [id, { id }]))

  it("skips unknown, duplicate, and excluded ids", () => {
    const result = resolveRecentDestinations(["today", "a", "gone", "a", "b"], items, {
      excludeIds: ["today"],
    })
    expect(result.map((i) => i.id)).toEqual(["a", "b"])
  })

  it("respects the limit", () => {
    expect(resolveRecentDestinations(["a", "b", "c", "d"], items, { limit: 2 })).toHaveLength(2)
  })
})
