"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { getApiErrorMessage, koreanCoachApi, type KoreanCoachDashboard } from "@/lib/api"
import { getKoreanCoachScenario } from "@/lib/korean-coach/scenarios"

// Moved out of the Korean Coach landing page (Hengo V2 Phase 4) so the
// dominant "Start speaking" card doesn't compete with a session log.
export default function KoreanCoachHistoryPage() {
  useSessionTimer("korean_coach")
  const [dashboard, setDashboard] = useState<KoreanCoachDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    koreanCoachApi
      .getDashboard()
      .then((data) => {
        if (active) setDashboard(data)
      })
      .catch((cause) => {
        if (active) setError(getApiErrorMessage(cause, "Session history could not load."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-14">
      <header>
        <Button asChild variant="ghost" className="-ml-3 mb-3">
          <Link href="/korean-coach">
            <ArrowLeft aria-hidden="true" />
            Korean Coach
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Recent sessions</h2>
        </div>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !dashboard || dashboard.recentSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-medium">No completed sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish your first practice session to see a useful summary here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/70 rounded-2xl border border-border">
          {dashboard.recentSessions.map((session) => {
            const scenario = session.scenarioId
              ? getKoreanCoachScenario(session.scenarioId)
              : undefined
            return (
              <li key={session.id}>
                <Link
                  href={`/korean-coach/session/${session.id}`}
                  className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div>
                    <p className="font-medium">
                      {scenario?.englishTitle ??
                        (session.mode === "listening"
                          ? "Listening challenge"
                          : "Speaking practice")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(session.endedAt ?? session.startedAt).toLocaleDateString()} ·{" "}
                      {Math.max(1, Math.round(session.durationSeconds / 60))} min ·{" "}
                      {session.completedTurns} turns
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
