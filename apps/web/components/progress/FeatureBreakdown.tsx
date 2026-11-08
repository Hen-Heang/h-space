"use client"

import { useEffect, useState } from "react"
import {
  BookOpen,
  BookOpenText,
  GraduationCap,
  Headphones,
  Languages,
  MessageCircle,
  MessagesSquare,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { progressApi } from "@/lib/api"
import type { FeatureActivity } from "@/lib/types"

const FEATURE_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  chat: { label: "AI Coach", icon: MessageCircle },
  vocab: { label: "Vocabulary", icon: BookOpen },
  reading: { label: "Reading", icon: BookOpenText },
  listening: { label: "Listening", icon: Headphones },
  foundations: { label: "Foundations", icon: Languages },
  interview: { label: "Exam Prep", icon: GraduationCap },
  phrasebook: { label: "Phrasebook", icon: MessagesSquare },
}

// Where the last 30 days of practice time actually went — grouped from the
// same kori_activity_log rows useSessionTimer/useLogActivity already write
// per feature, just never aggregated per-feature before.
export function FeatureBreakdown() {
  const [data, setData] = useState<FeatureActivity[] | null>(null)

  useEffect(() => {
    let active = true
    progressApi
      .getFeatureBreakdown(30)
      .then((rows) => active && setData(rows))
      .catch(() => active && setData([]))
    return () => {
      active = false
    }
  }, [])

  if (data === null) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  const maxMinutes = Math.max(1, ...data.map((d) => d.totalMinutes))

  if (data.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-accent/5 px-4 py-4 text-sm font-medium text-muted-foreground">
        No tracked activity in the last 30 days yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const meta = FEATURE_LABELS[row.feature] ?? { label: row.feature, icon: MessageCircle }
        const Icon = meta.icon
        const pct = Math.round((row.totalMinutes / maxMinutes) * 100)
        return (
          <div key={row.feature} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{meta.label}</span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground/70">
                  {row.totalMinutes}m · {row.sessionCount} session
                  {row.sessionCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
