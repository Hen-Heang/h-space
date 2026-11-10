// Display-only helpers for Finance Analytics (components/finance/analytics).
//
// Nothing here calculates money: totals, category and payment-method amounts
// and the daily trend all arrive computed in AnalyticsSummary. These turn
// those values into "vs last month" wording, ranked shares and chart labels,
// so the components stay presentational and the wording is tested here.
import { krw } from "@/lib/finance-format"
import type { DailyFlowPoint } from "@/types/finance"

export type DeltaTone = "positive" | "negative" | "neutral"
export type DeltaDirection = "up" | "down" | "flat"

export interface MonthDelta {
  direction: DeltaDirection
  /** Whether the change is good news, given which way is better. */
  tone: DeltaTone
  /** "Up 12% vs last month", "Down ₩50,000 vs last month", "No change vs last month". */
  text: string
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0
}

/**
 * The month-over-month change of one KRW figure. A percentage when last month
 * had a value to compare against, otherwise the KRW difference (a change from
 * ₩0 has no meaningful percentage). `lowerIsBetter` flips the tone, so falling
 * expenses read as good news.
 */
export function monthDelta(
  current: number,
  previous: number,
  { lowerIsBetter = false }: { lowerIsBetter?: boolean } = {},
): MonthDelta {
  const now = finite(current)
  const before = finite(previous)
  const diff = now - before
  if (diff === 0) return { direction: "flat", tone: "neutral", text: "No change vs last month" }

  const direction: DeltaDirection = diff > 0 ? "up" : "down"
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  const pct = before !== 0 ? Math.round((Math.abs(diff) / Math.abs(before)) * 100) : null
  const amount = pct !== null ? `${pct}%` : krw.format(Math.abs(diff))
  return {
    direction,
    tone: improved ? "positive" : "negative",
    text: `${direction === "up" ? "Up" : "Down"} ${amount} vs last month`,
  }
}

/** Savings-rate change in percentage points ("Up 3.2 pts vs last month"). Higher is better. */
export function pointsDelta(current: number, previous: number): MonthDelta {
  const diff = Math.round((finite(current) - finite(previous)) * 10) / 10
  if (diff === 0) return { direction: "flat", tone: "neutral", text: "No change vs last month" }
  const direction: DeltaDirection = diff > 0 ? "up" : "down"
  const points = Math.abs(diff)
  return {
    direction,
    tone: diff > 0 ? "positive" : "negative",
    text: `${direction === "up" ? "Up" : "Down"} ${points} ${points === 1 ? "pt" : "pts"} vs last month`,
  }
}

export interface RankedShare<T> {
  item: T
  amountKrw: number
  /** Share of the total, 0–100. */
  sharePct: number
}

export interface RankedShares<T> {
  rows: RankedShare<T>[]
  /** Everything past `limit`, folded into one row; null when nothing was folded. */
  other: { count: number; amountKrw: number; sharePct: number } | null
  totalKrw: number
}

/**
 * Items ranked by amount, largest first, each with its share of the total.
 * Negative or non-finite amounts count as zero, so a share is never negative
 * or NaN. With a `limit`, the rest are folded into one "Other" entry.
 */
export function rankedShares<T>(
  items: T[],
  amountOf: (item: T) => number,
  limit?: number,
): RankedShares<T> {
  const amounts = items.map((item) => {
    const amount = finite(amountOf(item))
    return { item, amountKrw: amount > 0 ? amount : 0 }
  })
  const totalKrw = amounts.reduce((sum, entry) => sum + entry.amountKrw, 0)
  const share = (amount: number) => (totalKrw > 0 ? (amount / totalKrw) * 100 : 0)
  const ranked = amounts
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.amountKrw - a.amountKrw || a.index - b.index)
    .map(({ item, amountKrw }) => ({ item, amountKrw, sharePct: share(amountKrw) }))

  if (limit === undefined || ranked.length <= limit) return { rows: ranked, other: null, totalKrw }
  const folded = ranked.slice(limit)
  const otherAmount = folded.reduce((sum, entry) => sum + entry.amountKrw, 0)
  return {
    rows: ranked.slice(0, limit),
    other: { count: folded.length, amountKrw: otherAmount, sharePct: share(otherAmount) },
    totalKrw,
  }
}

/** "34% of expenses"; a sliver above zero reads "<1%" rather than "0%". */
export function shareLabel(sharePct: number): string {
  const safe = finite(sharePct)
  if (safe > 0 && safe < 1) return "<1% of expenses"
  return `${Math.round(Math.min(Math.max(safe, 0), 100))}% of expenses`
}

/** "Nov 3" for a YYYY-MM-DD date. */
export function trendDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** What a screen reader announces for one day of the trend. */
export function trendDayValueText(point: DailyFlowPoint): string {
  return `${trendDayLabel(point.date)}: income ${krw.format(point.incomeKrw)}, expenses ${krw.format(point.expenseKrw)}`
}

/** The day the trend opens on: the latest day with any activity, else the last day; -1 when empty. */
export function defaultTrendIndex(points: DailyFlowPoint[]): number {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!
    if (point.incomeKrw > 0 || point.expenseKrw > 0) return index
  }
  return points.length - 1
}

/**
 * Slider-style keyboard movement through the trend's days. Returns the next
 * index, or null when the key isn't one the chart handles (so it can bubble).
 */
export function trendIndexForKey(key: string, index: number, length: number): number | null {
  if (length <= 0) return null
  const clamp = (value: number) => Math.min(Math.max(value, 0), length - 1)
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(index + 1)
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(index - 1)
    case "PageUp":
      return clamp(index + 7)
    case "PageDown":
      return clamp(index - 7)
    case "Home":
      return 0
    case "End":
      return length - 1
    default:
      return null
  }
}
