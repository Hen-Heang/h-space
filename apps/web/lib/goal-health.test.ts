import { describe, expect, it } from "vitest"
import { computeGoalHealth, type GoalHealthInput } from "./goal-health"

const NOW = new Date("2026-07-23T00:00:00.000Z")

const baseInput = (overrides: Partial<GoalHealthInput> = {}): GoalHealthInput => ({
  goalStatus: "active",
  hasKeyResults: true,
  outcomeProgress: 50,
  allKeyResultsAchieved: false,
  activityTotalTasks: 5,
  targetDate: "2026-12-31T00:00:00.000Z",
  startDate: "2026-01-01T00:00:00.000Z",
  noDuration: false,
  now: NOW,
  daysSinceLastActivity: 1,
  overdueHighImpactTaskCount: 0,
  ...overrides,
})

describe("computeGoalHealth", () => {
  it("is completed when the goal itself is marked completed, regardless of other signals", () => {
    const result = computeGoalHealth(baseInput({ goalStatus: "completed", outcomeProgress: 10 }))
    expect(result.status).toBe("completed")
  })

  it("is not_started for a goal with no key results and no tasks", () => {
    const result = computeGoalHealth(
      baseInput({ hasKeyResults: false, activityTotalTasks: 0, outcomeProgress: null }),
    )
    expect(result.status).toBe("not_started")
  })

  it("is attention for a goal with no key results but some task activity (legacy fallback)", () => {
    const result = computeGoalHealth(
      baseInput({ hasKeyResults: false, activityTotalTasks: 3, outcomeProgress: null }),
    )
    expect(result.status).toBe("attention")
    expect(result.reason).toMatch(/no key results/i)
  })

  it("doesn't flag a goal without key results whose tasks are all done (100% isn't 'needs attention')", () => {
    const result = computeGoalHealth(
      baseInput({
        hasKeyResults: false,
        activityTotalTasks: 4,
        activityCompletedTasks: 4,
        outcomeProgress: null,
      }),
    )
    expect(result.status).toBe("on_track")
    // Not "completed": finishing every task doesn't prove the outcome was reached.
    expect(result.reason).toMatch(/mark the goal complete/i)
  })

  it("asks for a decision when every task is done but the deadline has passed", () => {
    const result = computeGoalHealth(
      baseInput({
        hasKeyResults: false,
        activityTotalTasks: 2,
        activityCompletedTasks: 2,
        outcomeProgress: null,
        targetDate: "2026-07-01T00:00:00.000Z",
      }),
    )
    expect(result.status).toBe("attention")
    expect(result.reason).toMatch(/deadline has passed/i)
  })

  it("keeps the legacy attention status while tasks without key results remain open", () => {
    const result = computeGoalHealth(
      baseInput({
        hasKeyResults: false,
        activityTotalTasks: 4,
        activityCompletedTasks: 3,
        outcomeProgress: null,
      }),
    )
    expect(result.status).toBe("attention")
  })

  it("is on_track when all key results are achieved", () => {
    const result = computeGoalHealth(
      baseInput({ allKeyResultsAchieved: true, outcomeProgress: 100 }),
    )
    expect(result.status).toBe("on_track")
    expect(result.reason).toMatch(/all key results are complete/i)
  })

  it("is on_track when progress matches or beats the expected pace", () => {
    // Jan 1 -> Dec 31 is ~364 days; Jul 23 is ~203 days elapsed (~56% expected).
    const result = computeGoalHealth(baseInput({ outcomeProgress: 60 }))
    expect(result.status).toBe("on_track")
  })

  it("is attention when progress is moderately (>10%) behind the expected pace", () => {
    const result = computeGoalHealth(baseInput({ outcomeProgress: 40 })) // ~16% behind ~56% expected
    expect(result.status).toBe("attention")
    expect(result.reason).toMatch(/behind the expected pace/)
  })

  it("is at_risk when progress is far (>25%) behind the expected pace", () => {
    const result = computeGoalHealth(baseInput({ outcomeProgress: 10 })) // ~46% behind
    expect(result.status).toBe("at_risk")
    expect(result.reason).toMatch(/behind the expected pace/)
  })

  it("is blocked once the deadline has passed and the outcome isn't complete", () => {
    const result = computeGoalHealth(
      baseInput({ targetDate: "2026-06-01T00:00:00.000Z", outcomeProgress: 70 }),
    )
    expect(result.status).toBe("blocked")
    expect(result.reason).toMatch(/deadline passed/i)
  })

  it("treats a no_duration goal as having no deadline pressure", () => {
    const result = computeGoalHealth(baseInput({ noDuration: true, outcomeProgress: 5 }))
    expect(result.status).toBe("on_track")
  })

  it("escalates for overdue high-impact tasks even when pace is fine", () => {
    const result = computeGoalHealth(
      baseInput({ outcomeProgress: 60, overdueHighImpactTaskCount: 1 }),
    )
    expect(result.status).toBe("attention")
    expect(result.reason).toMatch(/overdue high-impact/)
  })

  it("escalates to at_risk for three or more overdue high-impact tasks", () => {
    const result = computeGoalHealth(
      baseInput({ outcomeProgress: 60, overdueHighImpactTaskCount: 3 }),
    )
    expect(result.status).toBe("at_risk")
  })

  it("flags no activity during the review period (>=7 days) even when pace is fine", () => {
    const result = computeGoalHealth(baseInput({ outcomeProgress: 60, daysSinceLastActivity: 7 }))
    expect(result.status).toBe("attention")
    expect(result.reason).toMatch(/no high-impact action/i)
  })

  it("escalates inactivity to at_risk past 14 days", () => {
    const result = computeGoalHealth(baseInput({ outcomeProgress: 60, daysSinceLastActivity: 14 }))
    expect(result.status).toBe("at_risk")
  })

  it("picks the single most severe signal when multiple risk factors apply", () => {
    const result = computeGoalHealth(
      baseInput({ outcomeProgress: 10, overdueHighImpactTaskCount: 1, daysSinceLastActivity: 8 }),
    )
    // pace deficit (~46% behind) is at_risk; the others are only attention.
    expect(result.status).toBe("at_risk")
    expect(result.reason).toMatch(/behind the expected pace/)
  })

  it("never uses deadline pace when there's no target date", () => {
    const result = computeGoalHealth(baseInput({ targetDate: null, outcomeProgress: 1 }))
    expect(result.status).toBe("on_track")
  })
})
