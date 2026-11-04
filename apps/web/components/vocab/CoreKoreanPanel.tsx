"use client"

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpenCheck, CheckCircle2, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getUserId } from "@/lib/auth-store"
import { coreKoreanApi } from "@/lib/api/core-korean"
import {
  CORE_KOREAN_TOTAL,
  getCoreKoreanCoverage,
  nextCoreKoreanBatch,
} from "@/lib/core-korean-vocab"
import type { VocabItem } from "@/lib/types"

const BATCH_SIZE = 20

type CoreKoreanPanelProps = {
  words: VocabItem[]
  loading: boolean
}

export function CoreKoreanPanel({ words, loading }: CoreKoreanPanelProps) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const coverage = useMemo(() => getCoreKoreanCoverage(words), [words])
  const percent = Math.round((coverage.savedCount / CORE_KOREAN_TOTAL) * 100)
  const complete = coverage.missingCount === 0

  async function handleAddBatch() {
    const batch = nextCoreKoreanBatch(words, BATCH_SIZE)
    if (batch.length === 0) {
      toast.success("Core Korean 300 is already covered")
      return
    }

    setAdding(true)
    try {
      const inserted = await coreKoreanApi.addBatch(batch)
      const userId = getUserId()
      await queryClient.invalidateQueries({ queryKey: ["vocab", userId] })

      if (inserted > 0) {
        toast.success(`Added ${inserted} Core Korean words`, {
          description: "They are now part of your normal spaced-repetition reviews.",
        })
      } else {
        toast.success("This Core Korean batch is already covered")
      }
    } catch {
      toast.error("Could not add the Core Korean batch", {
        description: "Your existing vocabulary and review progress were not changed.",
      })
    } finally {
      setAdding(false)
    }
  }

  return (
    <section
      aria-labelledby="core-korean-title"
      className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm dark:bg-slate-900/50"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BookOpenCheck size={22} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-kicker">Learning foundation</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2
                id="core-korean-title"
                className="text-lg font-semibold text-foreground sm:text-xl"
              >
                Core Korean 300
              </h2>
              {complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={13} aria-hidden="true" /> Covered
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              A practical foundation for daily life, workplace communication, numbers, and developer
              Korean. Words you already saved count automatically.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
                {coverage.savedCount}
                <span className="text-base font-medium text-muted-foreground">
                  {` / ${CORE_KOREAN_TOTAL}`}
                </span>
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">core words saved</p>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {percent}%
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Core Korean 300 coverage"
            aria-valuemin={0}
            aria-valuemax={CORE_KOREAN_TOTAL}
            aria-valuenow={coverage.savedCount}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
          <Metric label="Saved" value={coverage.savedCount} />
          <Metric label="Mastered" value={coverage.masteredCount} />
          <Metric label="Avg. mastery" value={`${coverage.averageMastery}%`} />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-muted-foreground">
            {complete ? (
              <p>All 300 core terms are already represented in your vocabulary.</p>
            ) : (
              <p>
                <span className="font-semibold text-foreground">{coverage.missingCount}</span> core
                words are still missing. Add them gradually so reviews stay manageable.
              </p>
            )}
            {coverage.duplicateRows > 0 ? (
              <p className="mt-1 text-xs">
                {coverage.duplicateRows} duplicate core row{coverage.duplicateRows === 1 ? "" : "s"}
                detected; this view counts each term once and never deletes your review history.
              </p>
            ) : null}
          </div>

          {!complete ? (
            <Button
              type="button"
              onClick={handleAddBatch}
              disabled={adding || loading}
              className="min-h-11 w-full shrink-0 sm:w-auto"
            >
              {adding ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {adding ? "Adding…" : `Add next ${Math.min(BATCH_SIZE, coverage.missingCount)}`}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

type MetricProps = {
  label: string
  value: number | string
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/45 px-3 py-3 sm:px-4">
      <p className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-xs">
        {label}
      </p>
    </div>
  )
}
