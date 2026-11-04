"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isToday,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns"

import { itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { HabitCheckIn } from "@/lib/types"

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

export function CheckinCalendar({
  checkins,
  startedAt,
  onToggle,
}: {
  checkins: HabitCheckIn[]
  startedAt: string
  onToggle: (date: string) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const completed = new Set(checkins.filter((c) => c.completed).map((c) => c.date))
  const start = startOfDay(new Date(startedAt))
  const today = startOfDay(new Date())

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  // Pad the front of the grid so the 1st lands in its real weekday column.
  const leadingBlanks = startOfMonth(month).getDay()

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [@media(pointer:coarse)]:size-11"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <p className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={isAfter(startOfMonth(addMonths(month, 1)), today)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [@media(pointer:coarse)]:size-11"
          aria-label="Next month"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-xs font-semibold text-muted-foreground">
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isCompleted = completed.has(dateStr)
          const isFuture = isAfter(day, today)
          const beforeStart = isBefore(day, start) && !isToday(start)
          const disabled = isFuture || beforeStart

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(dateStr)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-90",
                disabled && "pointer-events-none text-muted-foreground/30",
                !disabled && !isCompleted && "bg-background text-muted-foreground hover:bg-accent",
                isCompleted && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
                isToday(day) && !isCompleted && !disabled && "ring-2 ring-emerald-500/40",
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
