"use client";

import { useRef, useState, type PointerEvent } from "react";
import { krw } from "@/lib/finance-format";
import type { DailyFlowPoint } from "@/types/finance";

const WIDTH = 640;
const HEIGHT = 200;
const PLOT_HEIGHT = HEIGHT - 20;

function point(index: number, amountKrw: number, max: number, stepX: number) {
  return { x: index * stepX, y: PLOT_HEIGHT - (amountKrw / max) * (PLOT_HEIGHT - 8) };
}

function pathFor(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export function CashFlowTrendChart({ data }: { data: DailyFlowPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => Math.max(d.incomeKrw, d.expenseKrw)));
  const stepX = data.length > 1 ? WIDTH / (data.length - 1) : 0;
  const incomePoints = data.map((d, i) => point(i, d.incomeKrw, max, stepX));
  const expensePoints = data.map((d, i) => point(i, d.expenseKrw, max, stepX));

  const totalIncome = data.reduce((sum, d) => sum + d.incomeKrw, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expenseKrw, 0);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredLabel = hovered
    ? new Date(`${hovered.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = data.length > 1 ? Math.round(relativeX / stepX) : 0;
    setHoverIndex(Math.min(Math.max(index, 0), data.length - 1));
  }

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
            Expense
          </span>
        </div>
        <p id="cash-flow-trend-summary" className="text-xs text-muted-foreground">
          {krw.format(totalIncome)} in · {krw.format(totalExpense)} out this month
        </p>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 w-full overflow-visible sm:h-52"
          role="img"
          aria-labelledby="cash-flow-trend-title cash-flow-trend-summary"
          preserveAspectRatio="none"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <title id="cash-flow-trend-title">Daily income and expense trend</title>
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
          <path d={pathFor(expensePoints)} fill="none" stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={pathFor(incomePoints)} fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hoverIndex !== null && (
            <>
              <line
                x1={incomePoints[hoverIndex].x}
                x2={incomePoints[hoverIndex].x}
                y1={0}
                y2={PLOT_HEIGHT}
                stroke="var(--muted-foreground)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={incomePoints[hoverIndex].x} cy={incomePoints[hoverIndex].y} r="4" fill="var(--success)" />
              <circle cx={expensePoints[hoverIndex].x} cy={expensePoints[hoverIndex].y} r="4" fill="var(--destructive)" />
            </>
          )}
        </svg>

        {hovered && hoveredLabel && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 max-w-[calc(100%-0.5rem)] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              ...(hoverIndex <= Math.max(data.length - 1, 1) * 0.2
                ? { left: 0 }
                : hoverIndex >= Math.max(data.length - 1, 1) * 0.8
                  ? { right: 0 }
                  : {
                      left: `${(hoverIndex / Math.max(data.length - 1, 1)) * 100}%`,
                      transform: "translateX(-50%)",
                    }),
            }}
          >
            <p className="font-semibold text-popover-foreground">{hoveredLabel}</p>
            <p className="text-success">Income {krw.format(hovered.incomeKrw)}</p>
            <p className="text-destructive">Expense {krw.format(hovered.expenseKrw)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>Day 1</span>
        <span>Day {data.length}</span>
      </div>
    </div>
  );
}
