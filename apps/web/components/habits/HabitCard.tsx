"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { CheckCircle2, Circle, Flame } from "lucide-react"

import { ReminderButton } from "@/components/reminders/ReminderButton"
import { itemVariants } from "@/lib/motion"
import { toCheckinDate, useHabitCheckins } from "@/hooks/useHabits"
import type { Habit } from "@/lib/types"
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from "./categoryMeta"
import { MilestoneBadge } from "./MilestoneBadge"

export function HabitCard({ habit }: { habit: Habit }) {
  const { checkins, currentStreak, milestone, loading, toggleCheckin } = useHabitCheckins(
    habit.id,
    habit.startedAt,
  )
  const Icon = CATEGORY_ICONS[habit.category]
  const today = toCheckinDate()
  const doneToday = checkins.some((checkin) => checkin.date === today && checkin.completed)

  return (
    <motion.div variants={itemVariants}>
      <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:bg-accent/50 sm:gap-4 sm:p-4">
        {/* Stretched link keeps the whole row useful for details. Interactive
            controls below render after it and stay clickable above the link. */}
        <Link
          href={`/growth/habits/${habit.id}`}
          className="absolute inset-0"
          aria-label={habit.label}
        />

        <div
          className={`pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLORS[habit.category]}`}
        >
          <Icon size={19} />
        </div>

        <div className="pointer-events-none min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{habit.label}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{CATEGORY_LABELS[habit.category]}</span>
            {!loading && currentStreak > 0 && (
              <span className="flex items-center gap-1 font-semibold">
                <Flame size={12} className="text-orange-500" />
                {currentStreak} day{currentStreak === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {!loading && milestone && (
          <div className="pointer-events-none hidden shrink-0 sm:block">
            <MilestoneBadge phase={milestone} />
          </div>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          onClick={() => void toggleCheckin(today)}
          disabled={loading}
          aria-label={
            doneToday
              ? `Undo today's check-in for ${habit.label}`
              : `Check in ${habit.label} for today`
          }
          title={doneToday ? "Done today" : "Check in today"}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-50"
        >
          <AnimatePresence mode="wait" initial={false}>
            {doneToday ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.5, rotate: -35 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <CheckCircle2 className="size-5 text-emerald-500" />
              </motion.span>
            ) : (
              <motion.span
                key="todo"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                <Circle className="size-5 text-muted-foreground/60" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="relative hidden shrink-0 sm:block">
          <ReminderButton
            entityType="habit"
            entityId={habit.id}
            deepLink="https://hengo.henheang.site/growth/habits"
            defaultTitle={`Check in: ${habit.label}`}
          />
        </div>
      </div>
    </motion.div>
  )
}
