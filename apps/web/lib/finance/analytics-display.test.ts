import { describe, expect, it } from "vitest"

import {
  defaultTrendIndex,
  monthDelta,
  pointsDelta,
  rankedShares,
  shareLabel,
  trendDayLabel,
  trendDayValueText,
  trendIndexForKey,
} from "./analytics-display"

describe("monthDelta", () => {
  it("reports a rise as a percentage of last month", () => {
    expect(monthDelta(1_200_000, 1_000_000)).toEqual({
      direction: "up",
      tone: "positive",
      text: "Up 20% vs last month",
    })
  })

  it("treats falling expenses as good news when lower is better", () => {
    expect(monthDelta(800_000, 1_000_000, { lowerIsBetter: true })).toEqual({
      direction: "down",
      tone: "positive",
      text: "Down 20% vs last month",
    })
    expect(monthDelta(1_100_000, 1_000_000, { lowerIsBetter: true }).tone).toBe("negative")
  })

  it("falls back to the KRW difference when last month was zero", () => {
    expect(monthDelta(50_000, 0).text).toBe("Up ₩50,000 vs last month")
  })

  it("measures a change in a negative figure against its size", () => {
    // Net went from -100k to +100k: up 200%, and that's an improvement.
    expect(monthDelta(100_000, -100_000)).toMatchObject({ direction: "up", tone: "positive" })
    expect(monthDelta(100_000, -100_000).text).toBe("Up 200% vs last month")
  })

  it("says no change, neutrally, when the figures match or aren't numbers", () => {
    expect(monthDelta(5, 5)).toEqual({
      direction: "flat",
      tone: "neutral",
      text: "No change vs last month",
    })
    expect(monthDelta(Number.NaN, 0).direction).toBe("flat")
  })

  it("handles huge amounts without losing the direction", () => {
    expect(monthDelta(987_654_321_000, 1).text).toMatch(/^Up \d+% vs last month$/)
  })
})

describe("pointsDelta", () => {
  it("rounds to one decimal and pluralises points", () => {
    expect(pointsDelta(31.25, 28).text).toBe("Up 3.3 pts vs last month")
    expect(pointsDelta(20, 21).text).toBe("Down 1 pt vs last month")
    expect(pointsDelta(20, 21).tone).toBe("negative")
    expect(pointsDelta(12.01, 12.02).direction).toBe("flat")
  })
})

describe("rankedShares", () => {
  const items = [
    { name: "b", amount: 100 },
    { name: "a", amount: 300 },
    { name: "c", amount: 100 },
    { name: "d", amount: 0 },
  ]

  it("ranks largest first, keeps ties in their given order, and computes shares", () => {
    const result = rankedShares(items, (item) => item.amount)
    expect(result.rows.map((row) => row.item.name)).toEqual(["a", "b", "c", "d"])
    expect(result.rows[0]!.sharePct).toBe(60)
    expect(result.totalKrw).toBe(500)
    expect(result.other).toBeNull()
  })

  it("folds everything past the limit into one Other entry", () => {
    const result = rankedShares(items, (item) => item.amount, 2)
    expect(result.rows).toHaveLength(2)
    expect(result.other).toEqual({ count: 2, amountKrw: 100, sharePct: 20 })
  })

  it("never yields negative or NaN shares", () => {
    const result = rankedShares(
      [
        { name: "x", amount: -50 },
        { name: "y", amount: Number.NaN },
      ],
      (item) => item.amount,
    )
    expect(result.totalKrw).toBe(0)
    expect(result.rows.every((row) => row.sharePct === 0)).toBe(true)
  })

  it("returns nothing for an empty list", () => {
    expect(rankedShares([], () => 1, 6)).toEqual({ rows: [], other: null, totalKrw: 0 })
  })
})

describe("shareLabel", () => {
  it("rounds, clamps, and shows slivers as <1%", () => {
    expect(shareLabel(33.6)).toBe("34% of expenses")
    expect(shareLabel(0.2)).toBe("<1% of expenses")
    expect(shareLabel(0)).toBe("0% of expenses")
    expect(shareLabel(140)).toBe("100% of expenses")
    expect(shareLabel(Number.NaN)).toBe("0% of expenses")
  })
})

describe("trend labels", () => {
  it("formats a day and the value a screen reader announces", () => {
    expect(trendDayLabel("2026-11-03")).toBe("Nov 3")
    expect(trendDayLabel("not-a-date")).toBe("not-a-date")
    expect(trendDayValueText({ date: "2026-11-03", incomeKrw: 0, expenseKrw: 12_500 })).toBe(
      "Nov 3: income ₩0, expenses ₩12,500",
    )
  })
})

describe("defaultTrendIndex", () => {
  it("opens on the latest day with activity, else the last day", () => {
    const day = (incomeKrw: number, expenseKrw: number) => ({
      date: "2026-11-01",
      incomeKrw,
      expenseKrw,
    })
    expect(defaultTrendIndex([day(0, 5), day(1, 0), day(0, 0)])).toBe(1)
    expect(defaultTrendIndex([day(0, 0), day(0, 0)])).toBe(1)
    expect(defaultTrendIndex([])).toBe(-1)
  })
})

describe("trendIndexForKey", () => {
  it("moves like a slider and clamps at the ends", () => {
    expect(trendIndexForKey("ArrowRight", 3, 30)).toBe(4)
    expect(trendIndexForKey("ArrowLeft", 0, 30)).toBe(0)
    expect(trendIndexForKey("ArrowUp", 29, 30)).toBe(29)
    expect(trendIndexForKey("PageUp", 25, 30)).toBe(29)
    expect(trendIndexForKey("PageDown", 3, 30)).toBe(0)
    expect(trendIndexForKey("Home", 12, 30)).toBe(0)
    expect(trendIndexForKey("End", 12, 30)).toBe(29)
  })

  it("leaves other keys and empty charts alone", () => {
    expect(trendIndexForKey("Tab", 3, 30)).toBeNull()
    expect(trendIndexForKey("ArrowRight", 0, 0)).toBeNull()
  })
})
