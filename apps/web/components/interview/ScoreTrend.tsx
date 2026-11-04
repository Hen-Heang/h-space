"use client"

import { useSyncExternalStore } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import type { ScorecardRecord } from "@/lib/interview-history"

function subscribeToHydration(callback: () => void) {
  queueMicrotask(callback)
  return () => undefined
}

/**
 * Trajectory of overall mock-interview scores over time, so the candidate can
 * see whether they're trending toward exam-ready. Renders nothing until mounted
 * (avoids SSR/CSR drift) and nothing until there's at least one scorecard.
 */
export function ScoreTrend({ records }: { records: ScorecardRecord[] }) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  if (!mounted || records.length === 0) return null

  const data = records.map((r, i) => ({
    n: i + 1,
    overall: r.overall,
  }))
  const latest = records[records.length - 1].overall
  const prev = records.length > 1 ? records[records.length - 2].overall : null
  const delta = prev === null ? null : Math.round((latest - prev) * 10) / 10

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40 sm:rounded-[2.2rem] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Your Progress
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
            {records.length} mock{records.length === 1 ? "" : "s"} scored
          </h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {latest.toFixed(1)}
            <span className="text-sm text-muted-foreground"> / 5</span>
          </p>
          {delta !== null && (
            <p
              className={cn(
                "mt-0.5 flex items-center justify-end gap-1 text-xs font-bold tabular-nums",
                delta > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : delta < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground",
              )}
            >
              {delta > 0 ? (
                <TrendingUp size={13} strokeWidth={3} />
              ) : delta < 0 ? (
                <TrendingDown size={13} strokeWidth={3} />
              ) : null}
              {delta > 0 ? `+${delta}` : delta} from last
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 h-40 w-full min-w-0 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -24, right: 8, top: 6, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="var(--color-border)"
              opacity={0.3}
            />
            <XAxis
              dataKey="n"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-primary)", strokeWidth: 2, strokeDasharray: "4 4" }}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                background: "var(--color-popover)",
                color: "var(--color-popover-foreground)",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                padding: "10px 14px",
              }}
              labelFormatter={(n) => `Mock ${n}`}
              formatter={(value) => [`${value} / 5`, "Overall"]}
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="var(--color-primary)"
              strokeWidth={4}
              strokeLinecap="round"
              dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
