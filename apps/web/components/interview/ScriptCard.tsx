"use client"

import { useId } from "react"
import Link from "next/link"
import { FileText, PencilLine, Repeat2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { countdownLabel, type DateCountdown, type ScriptSummary } from "@/lib/exam-prep-home"

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "unknown date"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** The learner's own exam script: how complete it is, when it was saved, and practice links. */
export function ScriptCard({
  summary,
  loading,
  syncFailed,
  dueLabel,
  due,
}: {
  summary: ScriptSummary
  loading: boolean
  syncFailed: boolean
  dueLabel: string
  due: DateCountdown
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="app-surface flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
          <FileText aria-hidden="true" className="size-4 text-primary" />
          My exam script
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Due {dueLabel} · {countdownLabel(due)}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading your script">
          <div className="h-5 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">Sections</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
              {summary.sectionsWritten} / {summary.totalSections}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">Words</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{summary.words}</dd>
          </div>
          <div className="col-span-2 text-xs text-muted-foreground">
            <dt className="sr-only">Last saved</dt>
            <dd>
              {summary.lastSavedAt
                ? `Last saved ${formatSavedAt(summary.lastSavedAt)}`
                : "Not saved yet — the editor starts from your drafted script."}
              {syncFailed && " Couldn't reach your account copy; showing this device's."}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-auto grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" className="h-11">
          <Link href="/interview/script">
            <PencilLine aria-hidden="true" /> Edit script
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/interview/repeat">
            <Repeat2 aria-hidden="true" /> Listen &amp; Repeat
          </Link>
        </Button>
      </div>
    </section>
  )
}
