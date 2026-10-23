"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"

import { DailySummaryCard } from "@/components/timeline/DailySummaryCard"
import { LogActivityDialog } from "@/components/timeline/LogActivityDialog"
import { TimelineFilters } from "@/components/timeline/TimelineFilters"
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useTimeline } from "@/hooks/useTimeline"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import {
  formatRangeLabel,
  localRangeFor,
  shiftAnchorDate,
  type DateRangeGranularity,
} from "@/lib/date-utils"
import { containerVariants, itemVariants } from "@/lib/motion"
import { filterTimelineEntries, groupTimelineByDay, type TimelineKind } from "@/lib/timeline"

export default function TimelinePage() {
  useSessionTimer("timeline")
  const [granularity, setGranularity] = useState<DateRangeGranularity>("day")
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [kind, setKind] = useState<TimelineKind | "all">("all")
  const [query, setQuery] = useState("")

  const range = useMemo(() => {
    const { start, end } = localRangeFor(anchorDate, granularity)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [anchorDate, granularity])

  const { entries, loading, error } = useTimeline(range)

  const filtered = useMemo(
    () => filterTimelineEntries(entries, { kind, query }),
    [entries, kind, query],
  )
  const days = useMemo(() => groupTimelineByDay(filtered), [filtered])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-16"
    >
      <motion.div variants={itemVariants} className="space-y-3">
        <WorkspaceTabs sectionId="memory" actions={<LogActivityDialog />} />
        <p className="text-sm text-muted-foreground">
          Completed tasks, habit check-ins, journal entries, Hengo time (app usage only), and logged
          activity, day by day.{" "}
          <span className="font-medium text-foreground tabular-nums">
            {loading ? "…" : filtered.length}
          </span>{" "}
          {filtered.length === 1 ? "entry" : "entries"} this period.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <TimelineFilters
          granularity={granularity}
          onGranularityChange={setGranularity}
          rangeLabel={formatRangeLabel(anchorDate, granularity)}
          onPrev={() => setAnchorDate((d) => shiftAnchorDate(d, granularity, -1))}
          onNext={() => setAnchorDate((d) => shiftAnchorDate(d, granularity, 1))}
          onToday={() => setAnchorDate(new Date())}
          kind={kind}
          onKindChange={setKind}
          query={query}
          onQueryChange={setQuery}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : error ? (
          <ErrorBanner>{error}</ErrorBanner>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Nothing in this period</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Complete a task, check in a habit, write a journal entry, or log an activity —
              it&apos;ll show up here.
            </p>
          </div>
        ) : (
          days.map((day) => <DailySummaryCard key={day.date} day={day} />)
        )}
      </motion.div>
    </motion.div>
  )
}
