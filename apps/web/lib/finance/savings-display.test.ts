import { describe, expect, it } from "vitest"

import {
  goalDeadline,
  goalProgress,
  goalRemainingLabel,
  goalsReachedLabel,
  isGoalReached,
  savedOfTargetLabel,
  savingsTotals,
} from "./savings-display"
import type { SavingsGoal } from "@/types/finance"

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    name: "Trip",
    icon: "✈️",
    color: "#3b82f6",
    targetUsd: 1_000,
    currentUsd: 250,
    deadline: null,
    note: null,
    purpose: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("savingsTotals", () => {
  it("is zero for no goals", () => {
    expect(savingsTotals([])).toEqual({
      count: 0,
      totalSavedUsd: 0,
      totalTargetUsd: 0,
      overallPct: 0,
      reachedCount: 0,
    })
  })

  it("sums goals, rounds the overall percent and counts reached goals", () => {
    const totals = savingsTotals([
      goal({ id: "a", targetUsd: 1_000, currentUsd: 250 }),
      goal({ id: "b", targetUsd: 500, currentUsd: 600 }),
      goal({ id: "c", targetUsd: 0, currentUsd: 0 }),
    ])
    expect(totals).toEqual({
      count: 3,
      totalSavedUsd: 850,
      totalTargetUsd: 1_500,
      overallPct: 57,
      reachedCount: 1,
    })
  })
})

describe("goalProgress", () => {
  it("never reports a zero-target goal as reached or divides by zero", () => {
    expect(goalProgress({ targetUsd: 0, currentUsd: 50 })).toEqual({
      pct: 0,
      remainingUsd: 0,
      reached: false,
    })
    expect(isGoalReached({ targetUsd: 0, currentUsd: 0 })).toBe(false)
  })

  it("can pass 100% and clamps the remainder at zero", () => {
    expect(goalProgress({ targetUsd: 100, currentUsd: 150 })).toEqual({
      pct: 150,
      remainingUsd: 0,
      reached: true,
    })
  })

  it("labels saved, remaining and reached", () => {
    expect(savedOfTargetLabel(1_200, 5_000)).toBe("$1,200.00 of $5,000.00")
    expect(goalRemainingLabel(goalProgress({ targetUsd: 5_000, currentUsd: 1_200 }))).toBe(
      "$3,800.00 to go",
    )
    expect(goalRemainingLabel(goalProgress({ targetUsd: 100, currentUsd: 100 }))).toBe(
      "Target reached",
    )
    expect(goalsReachedLabel(1, 1)).toBe("1 of 1 goal reached")
    expect(goalsReachedLabel(0, 3)).toBe("0 of 3 goals reached")
  })
})

describe("goalDeadline", () => {
  const now = new Date("2026-11-10T09:00:00").getTime()

  it("is null without a valid deadline", () => {
    expect(goalDeadline(goal(), now)).toBeNull()
    expect(goalDeadline(goal({ deadline: "not-a-date" }), now)).toBeNull()
  })

  it("counts days left, due today and overdue", () => {
    expect(goalDeadline(goal({ deadline: "2026-11-20" }), now)).toEqual({
      date: "Nov 20, 2026",
      status: "10d left",
      overdue: false,
    })
    expect(goalDeadline(goal({ deadline: "2026-11-10" }), now)?.status).toBe("Due today")
    expect(goalDeadline(goal({ deadline: "2026-11-01" }), now)).toEqual({
      date: "Nov 1, 2026",
      status: "Overdue",
      overdue: true,
    })
  })

  it("drops the countdown once the target is reached", () => {
    expect(
      goalDeadline(goal({ deadline: "2026-11-01", targetUsd: 100, currentUsd: 100 }), now),
    ).toEqual({ date: "Nov 1, 2026", status: null, overdue: false })
  })
})
