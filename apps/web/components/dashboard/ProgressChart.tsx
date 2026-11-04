"use client"

import { useSyncExternalStore } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import type { ProgressPoint } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

function subscribeToHydration(callback: () => void) {
  queueMicrotask(callback)
  return () => undefined
}

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40 lg:p-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Activity</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Weekly progress
          </h3>
        </div>
        <div className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20">
          Last 7 days
        </div>
      </div>

      <div className="mt-8 h-64 min-w-0 w-full sm:h-72 lg:h-80">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="minutesFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="var(--color-border)"
                opacity={0.3}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 13, fontWeight: 600 }}
                dy={15}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-primary)", strokeWidth: 2, strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: "20px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  padding: "12px 16px",
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{
                  fontWeight: "600",
                  marginBottom: "4px",
                  color: "var(--color-foreground)",
                  textTransform: "uppercase",
                  fontSize: "13px",
                  letterSpacing: "0.1em",
                }}
                itemStyle={{ padding: 0, fontSize: "14px", fontWeight: "bold" }}
                formatter={(value) => [formatDuration(Number(value)), "Activity"]}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="var(--color-primary)"
                fill="url(#minutesFill)"
                strokeWidth={4}
                animationDuration={1500}
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-2xl bg-muted/20" />
        )}
      </div>
    </div>
  )
}
