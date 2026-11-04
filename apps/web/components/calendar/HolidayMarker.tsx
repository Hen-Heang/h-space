"use client"

import { format } from "date-fns"

import { HOLIDAY_COUNTRY_META, type Holiday, type HolidayCountry } from "@/lib/holidays"
import { cn } from "@/lib/utils"
import { HolidayCountryFlag } from "./HolidayCountryFlag"

const COUNTRY_ACCENT_CLASS: Record<HolidayCountry, string> = {
  KR: "text-rose-700 hover:bg-rose-500/10 dark:text-rose-300",
  KH: "text-blue-700 hover:bg-blue-500/10 dark:text-blue-300",
}

interface HolidayMarkerProps {
  date: Date
  holidays: Holiday[]
  onClick: (date: Date) => void
  variant: "month" | "time-grid"
  className?: string
}

export function HolidayMarker({ date, holidays, onClick, variant, className }: HolidayMarkerProps) {
  if (holidays.length === 0) return null

  const countries = Array.from(new Set(holidays.map((holiday) => holiday.country)))
  const summary = holidays
    .map((holiday) => `${HOLIDAY_COUNTRY_META[holiday.country].label}: ${holiday.name}`)
    .join("; ")
  const label = holidays.length === 1 ? holidays[0].name : `${holidays.length} holidays`
  const accentClass =
    countries.length === 1
      ? COUNTRY_ACCENT_CLASS[countries[0]]
      : "text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick(date)
      }}
      aria-label={`View holiday details for ${format(date, "MMMM d, yyyy")}: ${summary}`}
      title={summary}
      className={cn(
        "flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        variant === "month" && "h-6 shrink-0 px-0.5 text-xs",
        variant === "time-grid" && "mx-auto mb-1 min-h-6 max-w-[calc(100%-0.5rem)] px-1 text-xs",
        accentClass,
        className,
      )}
    >
      <span className="flex shrink-0 items-center -space-x-1" aria-hidden="true">
        {countries.map((country) => (
          <HolidayCountryFlag
            key={country}
            country={country}
            decorative
            className={cn(variant === "month" ? "h-3 w-[18px] sm:h-4 sm:w-6" : "h-3.5 w-[21px]")}
          />
        ))}
      </span>
      <span className={cn("min-w-0 truncate", variant === "month" && "hidden")}>{label}</span>
    </button>
  )
}
