"use client"

import { useEffect, useRef, useState } from "react"
import { TimerIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Whole-interview countdown for exam mode. Derives the remaining time from
 * Date.now() each tick (re-renders and background tabs can't drift it).
 *
 * onExpire fires on every tick once time is up, not just once: the parent's
 * finish handler no-ops while the examiner is still streaming or an evaluation
 * is already running, so re-firing is what guarantees the session still ends
 * the moment it becomes possible. The parent unmounts the timer when it
 * transitions to the summary, which stops the ticks.
 *
 * Because it re-fires, the parent must act on expiry at most once (see
 * `decideExamExpiry`); otherwise a failed evaluation is retried every tick.
 */
export function ExamTimer({
  endsAt,
  onExpire,
}: {
  /** Epoch ms when the exam ends. */
  endsAt: number
  onExpire: () => void
}) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt - Date.now()))
  // Latest callback, so the interval never calls a stale closure (the parent
  // passes a fresh one each render carrying the current session state).
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now())
      setRemainingMs(left)
      if (left <= 0) onExpireRef.current()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const urgent = totalSeconds <= 30
  const warning = totalSeconds <= 120

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums",
        urgent
          ? "animate-pulse bg-rose-500/15 text-rose-600 dark:text-rose-400"
          : warning
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-accent/40 text-foreground",
      )}
    >
      <TimerIcon size={15} />
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  )
}
