"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { AlertTriangle, Bell, Flame, ListChecks } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ReviewSummaryCard } from "./ReviewSummaryCard"
import { useReviewSummary } from "@/hooks/useReviewSummary"
import { formatMorningBriefContext, type MorningBrief } from "@/lib/review"
import { GOAL_HEALTH_LABELS } from "@/lib/goals"
import { itemVariants } from "@/lib/motion"

export function MorningBriefView({ brief }: { brief: MorningBrief }) {
  const context = formatMorningBriefContext(brief)
  const { summary, focusSuggestion, loading, error } = useReviewSummary("morning", context)

  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-foreground">{brief.dateLabel}</h2>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flame size={14} className="text-orange-500" />
          {brief.streakDays} day streak
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReviewSummaryCard
          summary={summary}
          focusSuggestion={focusSuggestion}
          loading={loading}
          error={error}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks size={16} />
          Tasks today
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {brief.taskCounts.overdueCount > 0 && (
            <Badge variant="destructive">{brief.taskCounts.overdueCount} overdue</Badge>
          )}
          <Badge variant="outline">{brief.taskCounts.scheduledCount} scheduled</Badge>
          <Badge variant="outline">{brief.taskCounts.anytimeCount} anytime</Badge>
          <Badge variant="outline">{brief.taskCounts.completedCount} done</Badge>
        </div>
        <Link
          href="/goals/tasks"
          className="mt-2 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary hover:underline"
        >
          Open today&apos;s tasks →
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Habits</span>
          <span className="text-xs text-muted-foreground">
            {brief.habitsDoneCount}/{brief.habitsTotalCount} checked in
          </span>
        </div>
        {brief.habitsPending.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {brief.habitsPending.map((h) => (
              <Badge key={h.id} variant="outline">
                {h.label}
              </Badge>
            ))}
          </div>
        ) : brief.habitsTotalCount > 0 ? (
          <p className="text-xs text-muted-foreground">All caught up.</p>
        ) : null}
        <Link
          href="/growth/habits"
          className="mt-2 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary hover:underline"
        >
          Open Habits →
        </Link>
      </motion.div>

      {brief.remindersToday.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell size={16} />
            Due today
          </div>
          <ul className="space-y-1 text-sm text-foreground">
            {brief.remindersToday.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
          <Link
            href="/settings/reminders"
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            Manage reminders →
          </Link>
        </motion.div>
      )}

      {brief.goalsAtRisk.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle size={16} className="text-amber-500" />
            Goals needing attention
          </div>
          <ul className="space-y-2">
            {brief.goalsAtRisk.map((g) => (
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
