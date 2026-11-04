"use client"

import { useMemo, useSyncExternalStore } from "react"
import { format } from "date-fns"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Target,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/tasks"
import {
  calculateDailyTrend,
  calculateVelocityData,
  computeAnalytics,
  getProductivityBreakdown,
  type SmartInsight,
} from "@/lib/analytics"

// recharts needs the DOM; render only after hydration to avoid SSR mismatch
// (same trick as ProgressChart).
function useMounted() {
  return useSyncExternalStore(
    (cb) => {
      queueMicrotask(cb)
      return () => undefined
    },
    () => true,
    () => false,
  )
}

const insightStyle: Record<SmartInsight["type"], { icon: React.ElementType; color: string }> = {
  warning: { icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
  trend: { icon: TrendingUp, color: "text-blue-500 bg-blue-500/10" },
  recommendation: { icon: Lightbulb, color: "text-amber-500 bg-amber-500/10" },
  prediction: { icon: Target, color: "text-violet-500 bg-violet-500/10" },
  productivity: { icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10" },
}

export function SmartAnalytics({
  tasks,
  targetDate,
}: {
  tasks: Task[]
  targetDate?: string | null
}) {
  const mounted = useMounted()

  const { analytics, breakdown, daily, velocity } = useMemo(
    () => ({
      analytics: computeAnalytics(tasks, targetDate),
      breakdown: getProductivityBreakdown(tasks),
      daily: calculateDailyTrend(tasks),
      velocity: calculateVelocityData(tasks),
    }),
    [tasks, targetDate],
  )

  const scoreColor =
    analytics.productivityScore >= 80
      ? "text-emerald-500"
      : analytics.productivityScore >= 50
        ? "text-blue-500"
        : "text-amber-500"

  const TrendIcon =
    analytics.velocityTrend === "increasing"
      ? TrendingUp
      : analytics.velocityTrend === "decreasing"
        ? TrendingDown
        : Minus

  const breakdownBars = [
    { label: "Completion", value: breakdown.completionRate },
    { label: "Recent activity", value: breakdown.recentActivity },
    { label: "Consistency", value: breakdown.consistency },
  ]

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="rounded-[1.5rem] border-border bg-card/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Productivity
          </p>
          <p className={cn("mt-1 text-3xl font-bold tabular-nums", scoreColor)}>
            {analytics.productivityScore}
            <span className="text-base text-muted-foreground">/100</span>
          </p>
        </Card>
        <Card className="rounded-[1.5rem] border-border bg-card/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Velocity
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold capitalize text-foreground">
            <TrendIcon className="h-5 w-5 text-primary" /> {analytics.velocityTrend}
          </p>
        </Card>
        <Card className="rounded-[1.5rem] border-border bg-card/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Est. finish
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {analytics.estimatedCompletionDate
              ? format(analytics.estimatedCompletionDate, "MMM d, yyyy")
              : "—"}
          </p>
        </Card>
      </div>

      {/* Productivity breakdown */}
      <Card className="rounded-[1.5rem] border-border bg-card/50 p-6">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Productivity breakdown
        </h4>
        <div className="space-y-3">
          {breakdownBars.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="tabular-nums text-foreground">{b.value}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${b.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts */}
      {mounted && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[1.5rem] border-border bg-card/50 p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Completions · 30 days
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => format(new Date(d), "M/d")}
                  tick={{ fontSize: 10 }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  labelFormatter={(d) => format(new Date(d as string), "MMM d")}
                  contentStyle={{ fontSize: 12, borderRadius: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--primary)"
                  fill="url(#cgrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="rounded-[1.5rem] border-border bg-card/50 p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Weekly velocity
            </h4>
            {velocity.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Complete tasks to see your weekly velocity.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={velocity} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/40"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(d: string) => format(new Date(d), "M/d")}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    labelFormatter={(d) => `Week of ${format(new Date(d as string), "MMM d")}`}
                    contentStyle={{ fontSize: 12, borderRadius: 12 }}
                  />
                  <Bar dataKey="velocity" radius={[6, 6, 0, 0]}>
                    {velocity.map((_, i) => (
                      <Cell key={i} fill="var(--primary)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <Card className="rounded-[1.5rem] border-border bg-card/50 p-6">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Insights
          </h4>
          <ul className="space-y-3">
            {analytics.insights.map((ins, i) => {
              const s = insightStyle[ins.type]
              const Icon = s.icon
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      s.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{ins.title}</p>
                    <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                      {ins.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
