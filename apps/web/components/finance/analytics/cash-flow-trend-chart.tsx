"use client"

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import {
  defaultTrendIndex,
  trendDayLabel,
  trendDayValueText,
  trendIndexForKey,
} from "@/lib/finance/analytics-display"
import type { DailyFlowPoint } from "@/types/finance"

const WIDTH = 640
const HEIGHT = 200
const PLOT_HEIGHT = HEIGHT - 20

function yFor(amountKrw: number, max: number): number {
  return PLOT_HEIGHT - (Math.max(amountKrw, 0) / max) * (PLOT_HEIGHT - 8)
}

function pathFor(values: number[], max: number, stepX: number): string {
  return values
    .map(
      (value, i) =>
        `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${yFor(value, max).toFixed(2)}`,
    )
    .join(" ")
}

/**
 * Daily income and expenses for the month. One day is always selected and
 * its values are shown in plain text above the plot — not in a hover-only
 * tooltip. The plot is a slider: Tab to it, then arrow keys (Page Up/Down
 * for a week, Home/End) move between days; tapping or dragging picks a day;
 * a mouse picks the day under it. Expenses are dashed so the two lines differ
 * by more than colour.
 */
export function CashFlowTrendChart({ data }: { data: DailyFlowPoint[] }) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<number | null>(null)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No daily figures for this month yet.</p>
  }

  const index = Math.min(selected ?? defaultTrendIndex(data), data.length - 1)
  const point = data[index]!
  const max = Math.max(1, ...data.map((d) => Math.max(d.incomeKrw, d.expenseKrw)))
  const stepX = data.length > 1 ? WIDTH / (data.length - 1) : 0
  const xPct = data.length > 1 ? (index / (data.length - 1)) * 100 : 50
  const lineX = data.length > 1 ? index * stepX : WIDTH / 2

  function indexAt(clientX: number): number | null {
    const plot = plotRef.current
    if (!plot) return null
    const rect = plot.getBoundingClientRect()
    if (rect.width <= 0) return null
    const ratio = (clientX - rect.left) / rect.width
    const next = Math.round(ratio * (data.length - 1))
    return Math.min(Math.max(next, 0), data.length - 1)
  }

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    // Mouse: follow the pointer. Touch/pen: only while pressed, so a
    // vertical page scroll that starts on the chart doesn't move the day.
    if (event.pointerType !== "mouse" && event.buttons === 0 && event.type === "pointermove") return
    const next = indexAt(event.clientX)
    if (next !== null) setSelected(next)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = trendIndexForKey(event.key, index, data.length)
    if (next === null) return
    event.preventDefault()
    setSelected(next)
  }

  return (
    <div className="app-surface min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg width="18" height="4" aria-hidden="true" className="shrink-0">
              <line
                x1="1"
                x2="17"
                y1="2"
                y2="2"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="4" aria-hidden="true" className="shrink-0">
              <line
                x1="1"
                x2="17"
                y1="2"
                y2="2"
                stroke="var(--destructive)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
            </svg>
            Expenses
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Highest day <span className="tabular-nums">{krw.format(max)}</span>
        </p>
      </div>

      {/* The selected day, always visible: works for touch, keyboard and print alike. */}
      <dl
        className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm"
        aria-hidden="true"
        data-testid="trend-readout"
      >
        <div>
          <dt className="sr-only">Day</dt>
          <dd className="font-semibold text-foreground">{trendDayLabel(point.date)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Income</dt>
          <dd className="font-semibold tabular-nums text-success">
            <AmountText value={krw.format(point.incomeKrw)} />
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Expenses</dt>
          <dd className="font-semibold tabular-nums text-destructive">
            <AmountText value={krw.format(point.expenseKrw)} />
          </dd>
        </div>
      </dl>

      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label="Daily income and expenses. Use the arrow keys to move between days."
        aria-valuemin={1}
        aria-valuemax={data.length}
        aria-valuenow={index + 1}
        aria-valuetext={trendDayValueText(point)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        className="relative mt-3 cursor-crosshair touch-pan-y select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-44 w-full overflow-visible sm:h-52"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {[0, 0.5, 1].map((position) => (
            <line
              key={position}
              x1="0"
              x2={WIDTH}
              y1={PLOT_HEIGHT * position}
              y2={PLOT_HEIGHT * position}
              stroke="var(--border)"
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={lineX}
            x2={lineX}
            y1={0}
            y2={PLOT_HEIGHT}
            stroke="var(--muted-foreground)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(
              data.map((d) => d.expenseKrw),
              max,
              stepX,
            )}
            fill="none"
            stroke="var(--destructive)"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(
              data.map((d) => d.incomeKrw),
              max,
              stepX,
            )}
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Markers are HTML so they stay round while the SVG stretches. */}
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-success"
          style={{ left: `${xPct}%`, top: `${(yFor(point.incomeKrw, max) / HEIGHT) * 100}%` }}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-destructive"
          style={{ left: `${xPct}%`, top: `${(yFor(point.expenseKrw, max) / HEIGHT) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex justify-between text-sm text-muted-foreground" aria-hidden="true">
        <span>{trendDayLabel(data[0]!.date)}</span>
        <span>{trendDayLabel(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  )
}
