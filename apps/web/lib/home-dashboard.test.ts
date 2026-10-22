import { describe, expect, it } from "vitest"

import type { ExternalCalendarEvent } from "@/lib/external-calendar"
import type { Goal } from "@/lib/goals"
import {
  goalTaskProgress,
  resolveRecentDestinations,
  selectActiveGoals,
  selectUpcomingEvents,
  upcomingEventsWindow,
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

const event = (id: string, start: string, end: string): ExternalCalendarEvent => ({
  id,
  source: "google",
  calendarId: "primary",
  title: id,
  start,
  end,
  allDay: false,
  readOnly: true,
})

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

describe("upcomingEventsWindow", () => {
  it("spans local midnight today to the end of tomorrow", () => {
    const now = new Date(2026, 9, 22, 15, 30)
    const { timeMin, timeMax } = upcomingEventsWindow(now)
    expect(new Date(timeMin)).toEqual(new Date(2026, 9, 22, 0, 0, 0, 0))
    expect(new Date(timeMax)).toEqual(new Date(2026, 9, 23, 23, 59, 59, 999))
  })
})

describe("selectUpcomingEvents", () => {
  const now = new Date("2026-10-22T10:00:00Z")

  it("drops ended events and sorts by start", () => {
    const result = selectUpcomingEvents(
      [
        event("later", "2026-10-22T15:00:00Z", "2026-10-22T16:00:00Z"),
        event("ended", "2026-10-22T08:00:00Z", "2026-10-22T09:00:00Z"),
        event("ongoing", "2026-10-22T09:30:00Z", "2026-10-22T10:30:00Z"),
      ],
      now,
    )
    expect(result.map((e) => e.id)).toEqual(["ongoing", "later"])
  })

  it("respects the limit", () => {
    const events = [1, 2, 3].map((h) =>
      event(`e${h}`, `2026-10-22T1${h}:00:00Z`, `2026-10-22T1${h}:30:00Z`),
    )
    expect(selectUpcomingEvents(events, now, 2)).toHaveLength(2)
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
