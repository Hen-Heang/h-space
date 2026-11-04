"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ReviewSummaryCard } from "./ReviewSummaryCard"
import { useReviewSummary } from "@/hooks/useReviewSummary"
import { formatWeeklyReviewContext, type WeeklyReviewSummary } from "@/lib/review"
import { GOAL_HEALTH_LABELS } from "@/lib/goals"
import { itemVariants } from "@/lib/motion"

export function WeeklyReviewView({ summary }: { summary: WeeklyReviewSummary }) {
  const context = formatWeeklyReviewContext(summary)
  const ai = useReviewSummary("weekly", context)

  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-foreground">{summary.rangeLabel}</h2>
        <p className="mt-1 text-sm text-muted-foreground">This week, at a glance.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReviewSummaryCard
          summary={ai.summary}
          focusSuggestion={ai.focusSuggestion}
          loading={ai.loading}
          error={ai.error}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.totalCompletedCount}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.totalHengoMinutes}</div>
          <div className="text-xs text-muted-foreground">Min in Hengo</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">
            {summary.totalManualActivityCount}
          </div>
          <div className="text-xs text-muted-foreground">Activities</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.journalDaysCount}/7</div>
          <div className="text-xs text-muted-foreground">Journal days</div>
        </div>
      </motion.div>

      {summary.habitCompletion.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="space-y-2 rounded-lg border border-border bg-card p-4"
        >
          <p className="text-sm font-semibold text-foreground">Habits</p>
          {summary.habitCompletion.map((h) => (
            <div key={h.habitId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{h.label}</span>
                <span className="text-muted-foreground">
                  {h.completedDays}/{h.totalDays}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${h.totalDays ? Math.round((h.completedDays / h.totalDays) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <Link
            href="/growth/habits"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary hover:underline"
          >
            Open Habits →
          </Link>
        </motion.div>
      )}

      {summary.goalsAtRisk.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle size={16} className="text-amber-500" />
            Goals needing a review
          </div>
          <ul className="space-y-2">
            {summary.goalsAtRisk.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/goals/${g.id}`} className="text-foreground hover:underline">
                  {g.title}
                </Link>
                <Badge variant="outline">{GOAL_HEALTH_LABELS[g.health_status]}</Badge>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
