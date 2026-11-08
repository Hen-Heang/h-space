"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowRight, FileText, GraduationCap } from "lucide-react"

import {
  EXAM_DATETIME,
  EXAM_DATE_LABEL,
  SCRIPT_DUE_DATE,
  countdownTo,
  daysUntil,
  isExamActive,
} from "@/lib/study-plan"

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const

/**
 * Live D/H/M/S countdown to the K-Specialist speaking exam, shown on the
 * dashboard for every account as a daily reminder. Ticks every second; the date
 * math is client-only (after mount) to avoid SSR/CSR drift. Stays up through the
 * whole exam day, then hides itself.
 */
export function ExamCountdownBanner() {
  // Render nothing until mounted so the server and first client render match
  // (the countdown is time-dependent and would otherwise hydrate-mismatch).
  const mounted = useSyncExternalStore(
    (callback) => {
      queueMicrotask(callback)
      return () => undefined
    },
    () => true,
    () => false,
  )
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  // Hide once there's no active/upcoming exam at all — including once the
  // exam day is fully over ("until you finish", then gone for good).
  if (!isExamActive(now)) return null

  const cd = countdownTo(EXAM_DATETIME, now)
  const daysToScript = daysUntil(SCRIPT_DUE_DATE, now)
  // Pad H/M/S to two digits; days stays as-is.
  const pad = (n: number) => String(n).padStart(2, "0")
  const display = {
    days: String(cd.days),
    hours: pad(cd.hours),
    minutes: pad(cd.minutes),
    seconds: pad(cd.seconds),
  }

  return (
    <Link
      href="/interview"
      className="group block overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-blue-500/10 p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] sm:p-5"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
          <GraduationCap size={24} />
        </div>

        <div className="min-w-0 flex-1">
          {cd.past ? (
            // Exam time reached, but the day isn't over yet — cheer, don't count.
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Exam day — 화이팅! 🎉
              </span>
              <span className="text-sm font-medium text-muted-foreground">Good luck today</span>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
                Countdown to your Korean exam
              </span>
              {/* Live D/H/M/S — re-renders every second. tabular-nums keeps the
                  digits from shifting as the seconds tick. */}
              <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
                {UNITS.map((unit, i) => (
                  <div key={unit.key} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-2xl">
                        {display[unit.key]}
                      </span>
                      <span className="mt-0.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-xs">
                        {unit.label}
                      </span>
                    </div>
                    {i < UNITS.length - 1 && (
                      <span className="-mt-2 text-lg font-bold text-muted-foreground/60 sm:text-2xl">
                        :
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <span>K-Specialist speaking exam · {EXAM_DATE_LABEL}</span>
            {daysToScript >= 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 text-blue-600 dark:text-blue-400">
                <FileText size={12} />
                script due in {daysToScript}d
              </span>
            )}
          </div>
        </div>

        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform group-hover:translate-x-0.5 sm:inline-flex">
          Practice
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}
