"use client"

import { useEffect, useState } from "react"

import { NumberTicker } from "@/components/ui/number-ticker"
import { elapsedBreakdown } from "@/lib/recovery"

const UNITS: { key: keyof ReturnType<typeof elapsedBreakdown>; label: string }[] = [
  { key: "days", label: "days" },
  { key: "hours", label: "hrs" },
  { key: "minutes", label: "min" },
  { key: "seconds", label: "sec" },
]

/** Live-ticking days:hours:minutes:seconds since `since`, updating every second. */
export function LiveElapsedClock({ since }: { since: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const breakdown = elapsedBreakdown(since, now)

  return (
    <div className="flex items-end gap-3 sm:gap-4" role="timer" aria-live="off">
      {UNITS.map((unit, i) => (
        <div key={unit.key} className="flex items-end gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            {/* Seconds change every tick — a spring would only smear them, so
                they stay plain text; the slower units roll up smoothly. */}
            {unit.key === "seconds" ? (
              <span className="text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                {String(breakdown.seconds).padStart(2, "0")}
              </span>
            ) : (
              <NumberTicker
                value={breakdown[unit.key]}
                padStart={2}
                className="text-4xl font-bold tracking-normal tabular-nums text-foreground sm:text-5xl"
              />
            )}
            <span className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {unit.label}
            </span>
          </div>
          {i < UNITS.length - 1 && (
            <span className="pb-4 text-2xl font-bold text-muted-foreground/40 sm:text-3xl">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
