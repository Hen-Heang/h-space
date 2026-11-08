"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { CheckCircle2, Circle, Flame } from "lucide-react"

import { CATEGORY_ICONS } from "@/components/habits/categoryMeta"
import { Skeleton } from "@/components/ui/skeleton"
import { RowList } from "@/components/ui/row-list"
import { toCheckinDate, useHabitCheckins, useHabits } from "@/hooks/useHabits"
import type { Habit } from "@/lib/types"
import { cn } from "@/lib/utils"

import { DashboardNote } from "./dashboard-card"
import { CompactSummary, HOME_ROW } from "./home-primitives"

const VISIBLE_LIMIT = 3

function HabitCheckinRow({ habit }: { habit: Habit }) {
  const { checkins, currentStreak, loading, toggleCheckin } = useHabitCheckins(
    habit.id,
    habit.startedAt,
  )
  const today = toCheckinDate()
  const doneToday = checkins.some((c) => c.date === today && c.completed)
  const Icon = CATEGORY_ICONS[habit.category]

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={HOME_ROW}
    >
      {/* Neutral category icon — one accent colour per screen, not one per habit. */}
      <Icon size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      <span
        className={cn(
          "line-clamp-2 min-w-0 flex-1 break-words text-base text-foreground",
          doneToday && "text-muted-foreground line-through decoration-muted-foreground/50",
        )}
      >
        {habit.label}
      </span>
      {!loading && currentStreak > 0 && (
        <span
          className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-muted-foreground"
          aria-label={`${currentStreak}-day streak`}
        >
          <Flame size={14} aria-hidden="true" />
          {currentStreak}
        </span>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        aria-label={
          doneToday
            ? `Undo today's check-in for ${habit.label}`
            : `Check in ${habit.label} for today`
        }
        onClick={() => void toggleCheckin(today)}
        disabled={loading}
        className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <AnimatePresence mode="wait" initial={false}>
          {doneToday ? (
            <motion.span
              key="done"
              initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="todo"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.li>
  )
}

/**
 * Compact "Today's habit check-ins" widget — one toggle per active habit
 * (mirrors HabitCard's per-item useHabitCheckins usage, just condensed to a
 * single row). Capped so a long habit list stays scannable; the rest live in
 * Growth.
 */
export function TodayHabitCheckins() {
  const { activeHabits, loading, error } = useHabits()
  const visible = activeHabits.slice(0, VISIBLE_LIMIT)
  const remaining = Math.max(0, activeHabits.length - VISIBLE_LIMIT)

  return (
    <CompactSummary title="Today's habits" action={{ href: "/growth/habits", label: "View all" }}>
      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : error ? (
        <DashboardNote tone="error">Couldn&apos;t load your habits.</DashboardNote>
      ) : activeHabits.length === 0 ? (
        <DashboardNote>
          No active habits yet.{" "}
          <Link href="/growth/habits" className="font-medium text-primary hover:underline">
            Add one
          </Link>
        </DashboardNote>
      ) : (
        <>
          <RowList>
            {visible.map((habit) => (
              <HabitCheckinRow key={habit.id} habit={habit} />
            ))}
          </RowList>
          {remaining > 0 && (
            <p className="pt-2 text-sm text-muted-foreground">
              +{remaining} more habit{remaining === 1 ? "" : "s"} in Growth
            </p>
          )}
        </>
      )}
    </CompactSummary>
  )
}
