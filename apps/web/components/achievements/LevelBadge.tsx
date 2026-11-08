"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy } from "lucide-react"

import { achievementsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { LevelInfo } from "@/lib/types"

// Compact XP/level pill surfaced in the shell header — Achievements lives
// behind a single click everywhere, not just on its own hidden-away page.
export function LevelBadge({ className }: { className?: string }) {
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    let active = true
    // The badge lives in the persistent app shell, so it never remounts on
    // navigation — refetch on every route change (and tab refocus) so XP
    // earned mid-session and on other pages actually shows up here.
    function refresh() {
      achievementsApi
        .getSummary()
        .then((summary) => {
          if (active) setLevel(summary.level)
        })
        .catch(() => {
          /* badge is decorative — fail silently */
        })
    }
    refresh()
    window.addEventListener("focus", refresh)
    return () => {
      active = false
      window.removeEventListener("focus", refresh)
    }
  }, [pathname])

  if (!level) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-[26px] w-[92px] animate-pulse rounded-full border border-border/50 bg-muted/40",
          className,
        )}
      />
    )
  }

  const pct =
    level.xpForNextLevel && level.xpForNextLevel > 0
      ? Math.min(100, Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100))
      : 100

  return (
    <Link
      href="/achievements"
      title={`Level ${level.level} · ${level.totalXp} XP${level.xpForNextLevel ? ` · ${level.xpIntoLevel}/${level.xpForNextLevel} to next level` : ""}`}
      className={cn(
        "flex flex-col gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700 transition-transform hover:scale-105 active:scale-95 dark:text-amber-400",
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        <Trophy size={13} />
        <span className="text-xs font-bold uppercase tracking-wide text-nowrap">
          Lv {level.level} · {level.totalXp} XP
        </span>
      </span>
      {level.xpForNextLevel ? (
        <span className="h-1 w-full overflow-hidden rounded-full bg-amber-500/15">
          <span
            className="block h-full rounded-full bg-amber-500 transition-all dark:bg-amber-400"
            style={{ width: `${pct}%` }}
          />
        </span>
      ) : null}
    </Link>
  )
}
