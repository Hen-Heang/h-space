import { describe, expect, it } from "vitest"
import { toLocalDateString } from "@/lib/date-utils"
import { calculateGoalDeadlineInfo, formatDeadlineFooter, type Goal } from "@/lib/goals"

const baseGoal = (overrides: Partial<Goal> = {}): Goal =>
  ({
    id: "g1",
    title: "Test goal",
    description: "",
    target_date: "2026-12-31",
    status: "active",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    metadata: { goal_type: "general" },
    user_id: "u1",
    outcome_progress: 0,
    health_status: "on_track",
    ...overrides,
  }) as Goal

describe("formatDeadlineFooter", () => {
  it("shows 'No deadline' for no-duration goals regardless of dates", () => {
    const goal = baseGoal({ no_duration: true, target_date: null })
    const info = calculateGoalDeadlineInfo(goal)
    expect(formatDeadlineFooter(goal, info)).toBe("No deadline")
  })

  it("shows the completion date for completed goals", () => {
    const goal = baseGoal({ status: "completed", target_date: "2026-08-05" })
    const info = calculateGoalDeadlineInfo(goal)
    expect(formatDeadlineFooter(goal, info)).toBe("Completed Aug 5, 2026")
  })

  it("shows overdue days for a past target date", () => {
    const goal = baseGoal({ target_date: "2020-01-01" })
    const info = calculateGoalDeadlineInfo(goal)
    expect(formatDeadlineFooter(goal, info)).toMatch(/^Overdue by \d+d$/)
  })

  it("shows 'Due today' when the target date is today", () => {
    // The local date, like the app. toISOString() gave the UTC date, so this
    // failed before 09:00 KST, when UTC is still on the previous day.
    const today = toLocalDateString(new Date())
    const goal = baseGoal({ target_date: today })
    const info = calculateGoalDeadlineInfo(goal)
    expect(formatDeadlineFooter(goal, info)).toBe("Due today")
  })

  it("shows the date plus days remaining when on track", () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const goal = baseGoal({ target_date: future.toISOString().split("T")[0] })
    const info = calculateGoalDeadlineInfo(goal)
    expect(formatDeadlineFooter(goal, info)).toMatch(/^[A-Z][a-z]{2} \d{1,2} · \d+d left$/)
  })
})
