"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { CheckCircle2, Circle, Clock, Zap } from "lucide-react"

import { TimelineEntryRow } from "@/components/timeline/TimelineEntryRow"
import { ReviewSummaryCard } from "./ReviewSummaryCard"
import { useReviewSummary } from "@/hooks/useReviewSummary"
import { formatEveningReviewContext, type EveningReviewSummary } from "@/lib/review"
import type { TimelineEntry } from "@/lib/timeline"
import { itemVariants } from "@/lib/motion"

export function EveningReviewView({
  summary,
  entries,
}: {
  summary: EveningReviewSummary
  entries: TimelineEntry[]
}) {
  const context = formatEveningReviewContext(summary)
  const ai = useReviewSummary("evening", context)

  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-foreground">{summary.dateLabel}</h2>
        <p className="mt-1 text-sm text-muted-foreground">How today went.</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ReviewSummaryCard
          summary={ai.summary}
          focusSuggestion={ai.focusSuggestion}
          loading={ai.loading}
          error={ai.error}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.completedCount}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.hengoMinutes}</div>
          <div className="text-xs text-muted-foreground">Min in Hengo</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{summary.manualActivityCount}</div>
          <div className="text-xs text-muted-foreground">
            <Zap size={11} className="mb-px inline" /> Logged
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {summary.journalDone ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <Circle size={16} className="text-muted-foreground" />
            )}
            Journal entry
          </div>
          {!summary.journalDone && (
            <Link
              href="/growth/journal"
              className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary hover:underline"
            >
              Write one →
            </Link>
          )}
        </div>
      </motion.div>

      {entries.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock size={13} />
            Today
          </div>
          {entries.map((entry) => (
            <TimelineEntryRow key={entry.id} entry={entry} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
