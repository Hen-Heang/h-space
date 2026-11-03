"use client"

import { format, isSameDay, isToday } from "date-fns"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Task } from "@/lib/tasks"
import { getTaskColor, hexWithAlpha, isExternalTask } from "@/lib/tasks"
import { getHolidaysForDate } from "@/lib/holidays"
import { HolidayMarker } from "./HolidayMarker"
import { useWeatherForecast } from "@/hooks/useWeatherForecast"
import { WeatherBadge } from "./WeatherBadge"

interface MonthViewProps {
  currentMonth: Date
  selectedDate?: Date
  onDateChange: (date: Date) => void
  getTasksForDate: (date: Date) => Task[]
  onTaskClick?: (task: Task) => void
  onHolidayClick: (date: Date) => void
  /** Desktop hover affordance: add a task on this date without leaving Month view. */
  onQuickAdd?: (date: Date) => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(currentMonth: Date): Date[] {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const totalCellsNeeded = daysInMonth + startingDayOfWeek
  const rowCount = totalCellsNeeded <= 28 ? 4 : totalCellsNeeded >= 36 ? 6 : 5
  const totalCells = rowCount * 7

  const days: Date[] = []
  // Leading days from the previous month (greyed out).
  for (let i = 0; i < startingDayOfWeek; i++) {
    const d = new Date(year, month, 0 - (startingDayOfWeek - i - 1))
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  const maxDays = Math.min(daysInMonth, totalCells - startingDayOfWeek)
  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(year, month, i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  while (days.length < totalCells) {
    const d = new Date(year, month + 1, days.length - startingDayOfWeek - maxDays + 1)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  return days
}

export function MonthView({
  currentMonth,
  selectedDate,
  onDateChange,
  getTasksForDate,
  onTaskClick,
  onHolidayClick,
  onQuickAdd,
}: MonthViewProps) {
  const days = getDaysInMonth(currentMonth)
  const rowCount = days.length / 7
  const maxVisibleTasks = rowCount >= 6 ? 1 : rowCount === 5 ? 2 : 3
  const { getWeatherForDate } = useWeatherForecast()

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card/20">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30 text-center">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                "py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                i === 0 || i === 6 ? "text-muted-foreground" : "text-muted-foreground",
              )}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        <div
          className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
        >
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const today = isToday(date)
            const dayTasks = isCurrentMonth ? getTasksForDate(date) : []
            const holidays = isCurrentMonth ? getHolidaysForDate(date) : []
            const weather = isCurrentMonth ? getWeatherForDate(date) : undefined

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "group relative flex min-h-10 flex-col gap-1 overflow-hidden border-b border-r border-border/50 p-0.5 transition-colors sm:min-h-0 sm:p-1.5",
                  index % 7 === 0 && "border-l",
                  Math.floor(index / 7) === 0 && "border-t",
                  !isCurrentMonth && "bg-muted/10 opacity-30",
                  isCurrentMonth && "hover:bg-muted/20",
                  isSelected && "bg-primary/5",
                )}
              >
                {isCurrentMonth && onQuickAdd && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onQuickAdd(date)
                    }}
                    aria-label={`Add task on ${format(date, "MMMM d")}`}
                    // Revealed on hover for a mouse; always shown (and larger)
                    // on touch, where there is no hover to reveal it. Phones
                    // (< sm) add through the selected day instead.
                    className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 group-hover:opacity-100 sm:flex [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:opacity-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="mb-0.5 flex items-center justify-center gap-0.5">
                  <button
                    type="button"
                    disabled={!isCurrentMonth}
                    onClick={() => onDateChange(date)}
                    aria-label={isCurrentMonth ? format(date, "MMMM d") : undefined}
                    aria-pressed={isCurrentMonth ? isSelected : undefined}
                    className={cn(
                      // 24px circle, ~40px tap area via the after: layer.
                      "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:h-7 sm:w-7",
                      today && !isSelected && "bg-primary text-primary-foreground shadow",
                      isSelected && "scale-110 bg-primary/90 text-primary-foreground shadow",
                      !today &&
                        !isSelected &&
                        holidays.length > 0 &&
                        "text-rose-600 dark:text-rose-400",
                      !today && !isSelected && holidays.length === 0 && "text-muted-foreground",
                    )}
                  >
                    {date.getDate()}
                  </button>
                  {isCurrentMonth && holidays.length > 0 && (
                    <HolidayMarker
                      date={date}
                      holidays={holidays}
                      onClick={onHolidayClick}
                      variant="month"
                    />
                  )}
                  {isCurrentMonth && weather && <WeatherBadge weather={weather} variant="month" />}
                </div>

                {isCurrentMonth && (
                  <div className="flex flex-1 flex-col justify-start gap-1">
                    {/* Mobile: dots */}
                    <div className="flex h-1.5 flex-wrap justify-center gap-0.5 px-1 sm:hidden">
                      {dayTasks.slice(0, 4).map((task, i) => (
                        <span
                          key={i}
                          className={cn("h-1 w-1 rounded-full", task.completed && "opacity-40")}
                          style={{ backgroundColor: getTaskColor(task) }}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      )}
                    </div>
                    {/* Desktop: chips */}
                    <div className="hidden flex-col gap-0.5 overflow-hidden sm:flex">
                      {dayTasks.slice(0, maxVisibleTasks).map((task) => {
                        const color = getTaskColor(task)
                        return (
                          <button
                            key={task.id}
                            type="button"
                            title={task.title || task.description}
                            onClick={(event) => {
                              event.stopPropagation()
                              onTaskClick?.(task)
                            }}
                            aria-label={task.title || task.description}
                            className={cn(
                              // Dense-visualisation exception (docs/design-system.md):
                              // 11px only in a ~41px phone month cell, 13px from sm.
                              "mx-0.5 flex items-center gap-1 truncate rounded-md border border-l-2 px-2 py-1 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:text-xs",
                              task.completed
                                ? "text-muted-foreground line-through opacity-60"
                                : "text-foreground hover:brightness-95 dark:hover:brightness-110",
                              isExternalTask(task) && "border-dashed",
                            )}
                            style={{
                              backgroundColor: hexWithAlpha(color, 0.16),
                              borderColor: hexWithAlpha(color, 0.38),
                              borderLeftColor: color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate">{task.title || task.description}</span>
                          </button>
                        )
                      })}
                      {dayTasks.length > maxVisibleTasks && (
                        <div className="text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
                          +{dayTasks.length - maxVisibleTasks} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
