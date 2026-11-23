import { format } from "date-fns"
import { Check } from "lucide-react"

import { isDoneOn, lastNDates } from "@/lib/habits"
import { cn } from "@/lib/utils"
import type { HabitCheckIn } from "@/lib/types"

/** Local midnight for a YYYY-MM-DD date (a bare `new Date(date)` would be UTC). */
function toDay(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

/**
 * The last 7 days as toggles, oldest first and today last, so a missed
 * check-in can be filled in from the list without opening the calendar.
 * Days before the habit started are disabled, like in `CheckinCalendar`.
 */
export function WeekStrip({
  habitLabel,
  checkins,
  startedAt,
  pendingDates,
  onToggle,
  now = new Date(),
  className,
}: {
  habitLabel: string
  checkins: HabitCheckIn[]
  startedAt: string
  pendingDates?: ReadonlySet<string>
  onToggle: (date: string) => void
  now?: Date
  className?: string
}) {
  const dates = lastNDates(7, now)
  const today = dates[dates.length - 1]
  const startDate = format(new Date(startedAt), "yyyy-MM-dd")

  return (
    <div
      role="group"
      aria-label={`Last 7 days of ${habitLabel}`}
      className={cn("grid grid-cols-7 gap-1", className)}
    >
      {dates.map((date) => {
        const day = toDay(date)
        const done = isDoneOn(checkins, date)
        const isToday = date === today
        const beforeStart = date < startDate
        const pending = pendingDates?.has(date) ?? false

        return (
          <button
            key={date}
            type="button"
            onClick={() => onToggle(date)}
            disabled={beforeStart}
            aria-pressed={done}
            aria-busy={pending || undefined}
            aria-label={`${habitLabel}, ${isToday ? "today" : format(day, "EEEE d MMMM")}`}
            className="group flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35"
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-[11px] leading-none",
                isToday ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {isToday ? "Today" : format(day, "EEEEE")}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-all group-active:scale-90",
                done ? "bg-emerald-500 text-white" : "border border-border text-muted-foreground",
                isToday && !done && "border-emerald-500/60",
              )}
            >
              {done ? <Check size={13} strokeWidth={3} /> : format(day, "d")}
            </span>
          </button>
        )
      })}
    </div>
  )
}
