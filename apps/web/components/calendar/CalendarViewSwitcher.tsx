"use client"

import { useState, type ReactNode } from "react"
import { endOfWeek, format, startOfWeek } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateTimePicker } from "@/components/ui/date-time-picker"

export type CalendarView = "day" | "week" | "month"

interface CalendarViewSwitcherProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  selectedDate: Date
  onNavigate: (dir: "prev" | "next" | "today") => void
  /** Jump straight to an arbitrary date, e.g. from the range-label date picker. */
  onJumpToDate?: (date: Date) => void
  views?: CalendarView[]
  showNav?: boolean
  toolbarEnd?: ReactNode
  className?: string
}

const rangeLabel = (view: CalendarView, date: Date): string => {
  if (view === "month") return format(date, "MMMM yyyy")
  if (view === "day") return format(date, "EEE, MMM d, yyyy")
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  const sameMonth = start.getMonth() === end.getMonth()
  return sameMonth
    ? `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
    : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
}

const compactRangeLabel = (view: CalendarView, date: Date): string => {
  if (view === "month") return format(date, "MMM yyyy")
  if (view === "day") return format(date, "EEE, MMM d")
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return start.getMonth() === end.getMonth()
    ? `${format(start, "MMM d")}–${format(end, "d")}`
    : `${format(start, "MMM d")}–${format(end, "MMM d")}`
}

export function CalendarViewSwitcher({
  view,
  onViewChange,
  selectedDate,
  onNavigate,
  onJumpToDate,
  views = ["day", "week", "month"],
  showNav = true,
  toolbarEnd,
  className,
}: CalendarViewSwitcherProps) {
  const fullLabel = rangeLabel(view, selectedDate)
  const [isJumpOpen, setIsJumpOpen] = useState(false)

  return (
    <div
      className={cn(
        // One row whenever it fits (an iPhone 15 Pro Max fits Today, the
        // arrows, the date and the view switch); wraps only on narrow phones.
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2 py-2 sm:px-3",
        className,
      )}
    >
      {showNav ? (
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 rounded-lg px-3 text-sm font-medium"
            onClick={() => onNavigate("today")}
          >
            Today
          </Button>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-lg"
              onClick={() => onNavigate("prev")}
              aria-label={`Previous ${view}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-lg"
              onClick={() => onNavigate("next")}
              aria-label={`Next ${view}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {onJumpToDate ? (
            <Popover open={isJumpOpen} onOpenChange={setIsJumpOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title={fullLabel}
                  aria-label={`${fullLabel}, jump to a date`}
                  className="ml-1 flex min-w-0 items-center gap-1 truncate rounded-lg px-1.5 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60 sm:text-base"
                >
                  <span className="sm:hidden">{compactRangeLabel(view, selectedDate)}</span>
                  <span className="hidden sm:inline">{fullLabel}</span>
                  <CalendarDays
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Jump to date</p>
                <DateTimePicker
                  granularity="day"
                  value={selectedDate}
                  onChange={(date) => {
                    if (!date) return
                    onJumpToDate(date)
                    setIsJumpOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <span
              title={fullLabel}
              className="ml-1 min-w-0 truncate text-sm font-semibold text-foreground sm:text-base"
              aria-live="polite"
            >
              <span className="sm:hidden">{compactRangeLabel(view, selectedDate)}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </span>
          )}
        </div>
      ) : (
        <span className="min-w-0 flex-1" />
      )}

      <div className="ml-auto flex items-center gap-2">
        <div
          role="group"
          aria-label="Calendar view"
          className="flex shrink-0 items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
        >
          {views.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => onViewChange(candidate)}
              aria-pressed={view === candidate}
              className={cn(
                "min-h-11 min-w-11 rounded-md px-2.5 py-1 text-sm font-medium capitalize transition-colors sm:px-3",
                view === candidate
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {candidate}
            </button>
          ))}
        </div>
        {toolbarEnd}
      </div>
    </div>
  )
}

export { rangeLabel }
