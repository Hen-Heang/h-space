"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { ArrowRight, Flame } from "lucide-react"

import {
  getBestStreak,
  getBestStreakServerSnapshot,
  subscribeBestStreak,
} from "@/lib/vocab-best-streak-store"

// Personal-best vocab quiz streak, server-backed so it syncs across devices.
// Written by the vocab ReviewSession.
export function BestQuizStreakCard() {
  const best = useSyncExternalStore(subscribeBestStreak, getBestStreak, getBestStreakServerSnapshot)

  return (
    <Link
      href="/vocab"
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-orange-500/40 dark:bg-slate-900/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
        <Flame size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold tabular-nums text-foreground">
          {best ?? "—"}
          {best ? (
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">in a row</span>
          ) : null}
        </p>
        <p className="text-xs font-medium text-muted-foreground/70">Best quiz streak</p>
      </div>
      <ArrowRight
        size={16}
        className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500"
      />
    </Link>
  )
}
