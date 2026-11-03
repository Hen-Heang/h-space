"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns"

import { cn } from "@/lib/utils"
import type { Task } from "@/lib/tasks"
import { getTaskColor, hexWithAlpha, isExternalTask } from "@/lib/tasks"
import { getAllDayTasks, layoutDayTasks, MINUTES_IN_DAY, formatTaskTimeRange } from "@/lib/calendar"
import { getHolidaysForDate } from "@/lib/holidays"
import { HolidayMarker } from "./HolidayMarker"
import { useWeatherForecast } from "@/hooks/useWeatherForecast"
import { WeatherBadge } from "./WeatherBadge"

// Mobile keeps two 44px half-hour targets per hour. Calendar passes a denser
// desktop value so a full workday fits in the expanded workspace.
const DEFAULT_HOUR_HEIGHT = 88
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOT_MINUTES = 30
const SLOTS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) => i * SLOT_MINUTES)

interface WeekTimeGridProps {
  mode: "week" | "day"
  selectedDate: Date
  getTasksForDate: (date: Date) => Task[]
  onTaskClick: (task: Task) => void
  onSlotClick?: (date: Date, time: string) => void
  onDateSelect?: (date: Date) => void
  onHolidayClick: (date: Date) => void
  hourHeight?: number
}

const formatHourLabel = (hour: number) => {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

export function WeekTimeGrid({
  mode,
  selectedDate,
  getTasksForDate,
  onTaskClick,
  onSlotClick,
  onDateSelect,
  onHolidayClick,
  hourHeight = DEFAULT_HOUR_HEIGHT,
}: WeekTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())
  const { getWeatherForDate } = useWeatherForecast()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const days = useMemo(() => {
    if (mode === "day") return [selectedDate]
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [mode, selectedDate])

  const timeZoneLabel = useMemo(() => {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(selectedDate)
      .find((candidate) => candidate.type === "timeZoneName")
    return part?.value ?? "Local"
  }, [selectedDate])

  // Auto-scroll so the current time is in view on mount / view change.
  useEffect(() => {
    if (!scrollRef.current) return
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const focusMin = Math.max(0, Math.min(nowMin, MINUTES_IN_DAY) - 90)
    scrollRef.current.scrollTop = (focusMin / 60) * hourHeight
  }, [hourHeight, mode])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const colWidth = `${100 / days.length}%`
  const totalHeight = hourHeight * 24

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky day-header row */}
      <div className="flex border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div
          className="flex w-14 shrink-0 items-end justify-end pb-2 pr-1.5 text-xs font-medium text-muted-foreground sm:w-16"
          title="Times use your local time zone"
        >
          {timeZoneLabel}
        </div>
        {days.map((day) => {
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)
          const holidays = getHolidaysForDate(day)
          const isHoliday = holidays.length > 0
          const weather = getWeatherForDate(day)
          return (
            <div
              key={day.toISOString()}
              className="flex min-w-0 flex-1 flex-col text-center"
              style={{ width: colWidth }}
            >
              <button
                type="button"
                onClick={() => onDateSelect?.(day)}
                aria-label={format(day, "EEEE, MMMM d")}
                aria-current={today ? "date" : undefined}
                aria-pressed={selected}
                className={cn(
                  "w-full px-1 py-2 text-center transition-colors",
                  onDateSelect && "hover:bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
                    isHoliday ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums sm:h-8 sm:w-8 sm:text-base",
                    today && "bg-primary text-primary-foreground",
                    !today && selected && "bg-primary/15 text-primary",
                    !today && !selected && isHoliday && "text-rose-600 dark:text-rose-400",
                    !today && !selected && !isHoliday && "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </div>
              </button>
              <div className="flex min-h-7 flex-col items-center gap-0.5 px-0.5">
                {isHoliday && (
                  <HolidayMarker
                    date={day}
                    holidays={holidays}
                    onClick={onHolidayClick}
                    variant="time-grid"
                  />
                )}
                {weather && <WeatherBadge weather={weather} variant="time-grid" />}
              </div>
            </div>
          )
        })}
      </div>

      <AllDayStrip
        days={days}
        getTasksForDate={getTasksForDate}
        onTaskClick={onTaskClick}
        colWidth={colWidth}
      />

      {/* Scrollable hour grid */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto no-scrollbar">
        <div className="flex" style={{ height: totalHeight }}>
          <div className="w-14 shrink-0 sm:w-16">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-r border-border/40"
                style={{ height: hourHeight }}
              >
                {hour > 0 && (
                  <span className="absolute -top-2 right-1.5 text-xs font-medium text-muted-foreground">
                    {formatHourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              tasks={getTasksForDate(day)}
              onTaskClick={onTaskClick}
              onSlotClick={onSlotClick}
              showNowLine={isToday(day)}
              nowMinutes={nowMinutes}
              colWidth={colWidth}
              hourHeight={hourHeight}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface AllDayStripProps {
  days: Date[]
  getTasksForDate: (date: Date) => Task[]
  onTaskClick: (task: Task) => void
  colWidth: string
}

function AllDayStrip({ days, getTasksForDate, onTaskClick, colWidth }: AllDayStripProps) {
  const perDay = days.map((day) => getAllDayTasks(getTasksForDate(day)))
  const hasAny = perDay.some((list) => list.length > 0)
  if (!hasAny) return null

  return (
    <div className="flex border-b border-border/60 bg-muted/30">
      <div className="flex w-14 shrink-0 items-center justify-end pr-1.5 sm:w-16">
        <span className="text-xs font-medium text-muted-foreground">All-day</span>
      </div>
      {days.map((day, i) => (
        // min-w-0: a flex item's minimum width is its content by default, so
        // one long (nowrap, truncated) chip title widened its column past
        // the screen at 320px instead of truncating inside it.
        <div
          key={day.toISOString()}
          className="min-w-0 flex-1 space-y-1 border-l border-border/40 p-1"
          style={{ width: colWidth }}
        >
          {perDay[i].map((task) => {
            const color = getTaskColor(task)
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick(task)}
                title={task.title || task.description || "Untitled"}
                aria-label={`${task.title || task.description || "Untitled"}${isExternalTask(task) ? ", Google Calendar, read-only" : ""}`}
                className={cn(
                  "min-h-11 w-full truncate rounded-md border-l-2 px-1.5 py-1 text-left text-xs font-medium text-foreground transition-colors lg:min-h-7",
                  task.completed && "line-through opacity-60",
                  isExternalTask(task) && "border-dashed",
                )}
                style={{ backgroundColor: hexWithAlpha(color, 0.16), borderLeftColor: color }}
              >
                {task.title || task.description || "Untitled"}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface DayColumnProps {
  day: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onSlotClick?: (date: Date, time: string) => void
  showNowLine: boolean
  nowMinutes: number
  colWidth: string
  hourHeight: number
}

function DayColumn({
  day,
  tasks,
  onTaskClick,
  onSlotClick,
  showNowLine,
  nowMinutes,
  colWidth,
  hourHeight,
}: DayColumnProps) {
  const positioned = useMemo(() => layoutDayTasks(tasks), [tasks])

  return (
    <div className="relative flex-1 border-l border-border/40" style={{ width: colWidth }}>
      {SLOTS.map((minutes) => {
        const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
        const mm = String(minutes % 60).padStart(2, "0")
        return (
          <button
            key={minutes}
            type="button"
            disabled={!onSlotClick}
            tabIndex={-1}
            onClick={() => onSlotClick?.(day, `${hh}:${mm}`)}
            aria-label={`Add task at ${hh}:${mm} on ${format(day, "EEEE, MMMM d")}`}
            className={cn(
              "absolute inset-x-0 z-0 text-left focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              onSlotClick && "hover:bg-accent/10",
              minutes % 60 === 0 && "border-b border-border/40",
            )}
            style={{ top: (minutes / 60) * hourHeight, height: hourHeight / 2 }}
          />
        )
      })}

      {showNowLine && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
          style={{ top: (nowMinutes / 60) * hourHeight }}
        >
          <div className="h-2 w-2 -ml-1 rounded-full bg-red-500" />
          <div className="h-px flex-1 bg-red-500" />
        </div>
      )}

      {positioned.map((p) => {
        const top = (p.startMin / 60) * hourHeight
        const height = ((p.endMin - p.startMin) / 60) * hourHeight
        const widthPct = 100 / p.lanes
        const color = getTaskColor(p.task)
        return (
          <button
            key={p.task.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onTaskClick(p.task)
            }}
            title={p.task.title || p.task.description || "Untitled"}
            aria-label={`${p.task.title || p.task.description || "Untitled"}, ${formatTaskTimeRange(
              p.task.daily_start_time,
              p.task.daily_end_time,
              p.task.is_anytime,
            )}${isExternalTask(p.task) ? ", Google Calendar, read-only" : ""}`}
            className={cn(
              "absolute z-10 overflow-hidden rounded-lg border border-l-[3px] px-1.5 py-1 text-left text-foreground shadow-sm transition-shadow duration-150 hover:z-30 hover:shadow-md focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80",
              p.task.completed && "opacity-60",
              isExternalTask(p.task) && "border-dashed",
            )}
            style={{
              top,
              height: Math.max(height - 2, 18),
              left: `calc(${p.lane * widthPct}% + 2px)`,
              width: `calc(${p.span * widthPct}% - 4px)`,
              backgroundColor: hexWithAlpha(color, 0.2),
              borderColor: hexWithAlpha(color, 0.4),
              borderLeftColor: color,
            }}
          >
            <div
              className={cn(
                "truncate text-xs font-semibold leading-tight",
                p.task.completed && "line-through",
              )}
            >
              {p.task.title || p.task.description || "Untitled"}
            </div>
            {height > 30 && (
              <div className="truncate text-[11px] opacity-80">
                {formatTaskTimeRange(
                  p.task.daily_start_time,
                  p.task.daily_end_time,
                  p.task.is_anytime,
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
