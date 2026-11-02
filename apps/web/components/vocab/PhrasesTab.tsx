"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageSquareText, RotateCw } from "lucide-react"

import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { DailyPhraseCard } from "@/components/practice/DailyPhraseCard"
import { dailyMissionQueryKey } from "@/hooks/useDailyMission"
import { dailyPhraseQueryKey, useDailyPhrase } from "@/hooks/useDailyPhrase"
import { dailyPhraseApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { DailyPhrase } from "@/lib/types"

// /vocab's Phrases tab: today's phrase first (learn it, save it to flashcards),
// then every earlier phrase. This is where the daily mission's `daily_phrase`
// step lands (`/vocab?tab=phrases`). Rendered only while the tab is open
// (Radix unmounts inactive tab content), so today's phrase — which
// dailyPhraseApi.getToday generates on its first request of the day — is
// fetched only when someone actually opens this tab, same as /practice does.
export function PhrasesTab() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const historyKey = ["daily-phrases", "history", userId] as const

  const { phrase: today, loading: todayLoading, error: todayError } = useDailyPhrase()
  const { data: history, isPending: historyLoading } = useQuery({
    queryKey: historyKey,
    queryFn: dailyPhraseApi.getHistory,
    enabled: userId != null,
  })

  function handleChange(next: DailyPhrase) {
    queryClient.setQueryData<DailyPhrase | null>(dailyPhraseQueryKey(userId), (prev) =>
      prev?.id === next.id ? next : prev,
    )
    queryClient.setQueryData<DailyPhrase[]>(historyKey, (prev) =>
      (prev ?? []).map((p) => (p.id === next.id ? next : p)),
    )
    // Learning today's phrase completes the mission step — let /learn and
    // /practice re-check it (missionsApi.refreshProgress) on their next read.
    void queryClient.invalidateQueries({ queryKey: dailyMissionQueryKey(userId) })
  }

  const earlier = (history ?? []).filter((p) => p.id !== today?.id)

  return (
    <div className="space-y-6">
      <section aria-labelledby="today-phrase-heading" className="space-y-3">
        <div>
          <h2 id="today-phrase-heading" className="text-base font-semibold text-foreground">
            Today&apos;s phrase
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            One practical expression a day. Mark it learned, or save it to your flashcards.
          </p>
        </div>
        {todayLoading ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : todayError || !today ? (
          <div className="space-y-3">
            <ErrorBanner>Couldn&apos;t load today&apos;s phrase.</ErrorBanner>
            <Button
              variant="outline"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: dailyPhraseQueryKey(userId) })
              }
            >
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <DailyPhraseCard phrase={today} onChange={handleChange} />
        )}
      </section>

      <section aria-labelledby="earlier-phrases-heading" className="space-y-3">
        <h2 id="earlier-phrases-heading" className="text-base font-semibold text-foreground">
          Earlier phrases
        </h2>
        {historyLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading saved phrases">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-52 w-full rounded-lg" />
            ))}
          </div>
        ) : earlier.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            <MessageSquareText aria-hidden="true" className="size-5 shrink-0" />
            Phrases from earlier days collect here.
          </div>
        ) : (
          earlier.map((phrase, index) => (
            <BlurFade key={phrase.id} inView delay={Math.min(index * 0.04, 0.24)}>
              <DailyPhraseCard phrase={phrase} onChange={handleChange} />
            </BlurFade>
          ))
        )}
      </section>
    </div>
  )
}
