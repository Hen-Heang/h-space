import { describe, expect, it } from "vitest"
import {
  consistencyPercent,
  currentStreak,
  daysActive,
  isDoneOn,
  lastNDates,
  longestStreak,
  withCheckin,
} from "./habits"
import type { HabitCheckIn } from "./types"

function checkin(date: string, completed = true): HabitCheckIn {
  return { id: date, habitId: "h1", date, completed, createdAt: `${date}T00:00:00.000Z` }
}

describe("currentStreak", () => {
  it("is 0 with no check-ins", () => {
    expect(currentStreak([], new Date("2026-07-15T12:00:00"))).toBe(0)
  })

  it("counts consecutive days ending today", () => {
    const checkins = [checkin("2026-07-13"), checkin("2026-07-14"), checkin("2026-07-15")]
    expect(currentStreak(checkins, new Date("2026-07-15T18:00:00"))).toBe(3)
  })

  it("doesn't break the streak just because today hasn't been logged yet", () => {
    const checkins = [checkin("2026-07-13"), checkin("2026-07-14")]
    expect(currentStreak(checkins, new Date("2026-07-15T08:00:00"))).toBe(2)
  })

  it("breaks the streak once yesterday is missing too", () => {
    const checkins = [checkin("2026-07-10"), checkin("2026-07-11")]
    expect(currentStreak(checkins, new Date("2026-07-15T08:00:00"))).toBe(0)
  })

  it("an explicit incomplete row for today doesn't break yesterday's streak", () => {
    const checkins = [checkin("2026-07-14"), checkin("2026-07-15", false)]
    expect(currentStreak(checkins, new Date("2026-07-15T18:00:00"))).toBe(1)
  })
})

describe("longestStreak", () => {
  it("is 0 with no completed check-ins", () => {
    expect(longestStreak([])).toBe(0)
  })

  it("finds the longest run even if it isn't the most recent one", () => {
    const checkins = [
      checkin("2026-07-01"),
      checkin("2026-07-02"),
      checkin("2026-07-03"),
      checkin("2026-07-10"),
    ]
    expect(longestStreak(checkins)).toBe(3)
  })

  it("never decreases when a later gap breaks the current streak", () => {
    const checkins = [checkin("2026-07-01"), checkin("2026-07-02"), checkin("2026-07-10")]
    expect(longestStreak(checkins)).toBe(2)
  })
})

describe("consistencyPercent", () => {
  it("is 100 when every day since start was completed", () => {
    const checkins = [checkin("2026-07-13"), checkin("2026-07-14"), checkin("2026-07-15")]
    expect(consistencyPercent(checkins, "2026-07-13", new Date("2026-07-15T12:00:00"))).toBe(100)
  })

  it("reflects missed days without resetting to 0", () => {
    const checkins = [checkin("2026-07-13"), checkin("2026-07-15")]
    // 3 elapsed days (13, 14, 15), 2 completed -> 67%
    expect(consistencyPercent(checkins, "2026-07-13", new Date("2026-07-15T12:00:00"))).toBe(67)
  })
})

describe("daysActive", () => {
  it("is 0 on the start day", () => {
    expect(daysActive("2026-07-15T09:00:00.000Z", new Date("2026-07-15T18:00:00"))).toBe(0)
  })

  it("counts elapsed calendar days", () => {
    expect(daysActive("2026-07-01T09:00:00.000Z", new Date("2026-07-15T18:00:00"))).toBe(14)
  })
})

describe("isDoneOn", () => {
  it("is true only for a completed row on that date", () => {
    const checkins = [checkin("2026-07-14"), checkin("2026-07-15", false)]
    expect(isDoneOn(checkins, "2026-07-14")).toBe(true)
    expect(isDoneOn(checkins, "2026-07-15")).toBe(false)
    expect(isDoneOn(checkins, "2026-07-16")).toBe(false)
  })
})

describe("withCheckin", () => {
  const now = new Date("2026-07-15T12:00:00")

  it("adds one completed row when checking in", () => {
    const next = withCheckin([checkin("2026-07-14")], "h1", "2026-07-15", true, now)
    expect(isDoneOn(next, "2026-07-15")).toBe(true)
    expect(next.filter((c) => c.date === "2026-07-15")).toHaveLength(1)
    expect(isDoneOn(next, "2026-07-14")).toBe(true)
  })

  it("replaces an incomplete row instead of adding a second one", () => {
    const next = withCheckin([checkin("2026-07-15", false)], "h1", "2026-07-15", true, now)
    expect(next).toHaveLength(1)
    expect(next[0].completed).toBe(true)
  })

  it("removes only that date's row when un-checking", () => {
    const next = withCheckin(
      [checkin("2026-07-14"), checkin("2026-07-15")],
      "h1",
      "2026-07-15",
      false,
      now,
    )
    expect(next.map((c) => c.date)).toEqual(["2026-07-14"])
  })
})

describe("lastNDates", () => {
  it("lists the last 7 local dates ending today, oldest first", () => {
    expect(lastNDates(7, new Date("2026-03-03T09:00:00"))).toEqual([
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ])
  })
})
