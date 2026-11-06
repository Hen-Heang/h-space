"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { phrasebookApi } from "@/lib/api"
import type { PhrasebookStats } from "@/lib/types"
import { situationLabel } from "@/lib/korean-phrasebook/labels"

type StatTileKey =
  | "cardsLearned"
  | "cardsDue"
  | "cardsMastered"
  | "listeningAttempts"
  | "speakingAttempts"
  | "successfulCommunicationRate"

const TILES: Array<{ key: StatTileKey; label: string; suffix?: string }> = [
  { key: "cardsLearned", label: "Learned" },
  { key: "cardsDue", label: "Due" },
  { key: "cardsMastered", label: "Mastered" },
  { key: "listeningAttempts", label: "Listening attempts" },
  { key: "speakingAttempts", label: "Speaking attempts" },
  { key: "successfulCommunicationRate", label: "Communication success", suffix: "%" },
]

// Cards learned/due/mastered + listening/speaking attempt counts + a
// communication-success rate — never a pronunciation score, since the app
// only ever has a text transcript to judge, never audio.
export function PhrasebookStatsCard() {
  const [stats, setStats] = useState<PhrasebookStats | null>(null)

  useEffect(() => {
    let active = true
    phrasebookApi
      .getStats()
      .then((res) => active && setStats(res))
      .catch(() => active && setStats(null))
    return () => {
      active = false
    }
  }, [])

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  const totalActivity = stats.workplaceActivityCount + stats.dailyActivityCount
  const workplacePct =
    totalActivity > 0 ? Math.round((stats.workplaceActivityCount / totalActivity) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((tile) => (
          <div key={tile.key} className="rounded-xl bg-accent/5 px-3 py-2.5 text-center">
            <p className="font-mono text-lg font-bold leading-none text-foreground">
              {stats[tile.key]}
              {tile.suffix ?? ""}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {totalActivity > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Workplace</span>
            <span>Daily life</span>
          </div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-accent/20">
            <div className="h-full bg-amber-500" style={{ width: `${workplacePct}%` }} />
            <div className="h-full bg-sky-500" style={{ width: `${100 - workplacePct}%` }} />
          </div>
        </div>
      )}

      {stats.mostDifficultSituations.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Toughest situations
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stats.mostDifficultSituations.map((s) => (
              <span
                key={s.situation}
                className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400"
              >
                {situationLabel(s.situation)} ({s.failureCount})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
