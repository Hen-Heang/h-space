"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpenCheck } from "lucide-react"

import { MistakeNotebook } from "@/components/korean-coach/MistakeNotebook"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { getApiErrorMessage, koreanCoachApi, type KoreanCoachMistake } from "@/lib/api"

export default function KoreanCoachMistakesPage() {
  useSessionTimer("korean_coach")
  const [mistakes, setMistakes] = useState<KoreanCoachMistake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    koreanCoachApi
      .listMistakes()
      .then((data) => {
        if (active) setMistakes(data)
      })
      .catch((cause) => {
        if (active) setError(getApiErrorMessage(cause, "Saved mistakes could not be loaded."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function updateMastered(id: string, mastered: boolean) {
    setError("")
    try {
      await koreanCoachApi.updateMistake(id, { mastered })
      setMistakes((current) =>
        current.map((mistake) => (mistake.id === id ? { ...mistake, mastered } : mistake)),
      )
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The mastered status could not be updated."))
    }
  }

  async function remove(id: string) {
    setError("")
    try {
      await koreanCoachApi.deleteMistake(id)
      setMistakes((current) => current.filter((mistake) => mistake.id !== id))
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The saved mistake could not be deleted."))
    }
  }

  async function practiceAgain(id: string) {
    try {
      await koreanCoachApi.updateMistake(id, { incrementReview: true })
    } catch {
      // Navigation to practice remains useful even if this optional counter fails.
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-14">
      <header>
        <Button asChild variant="ghost" className="-ml-3 mb-3">
          <Link href="/korean-coach">
            <ArrowLeft aria-hidden="true" />
            Korean Coach
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpenCheck aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Mistake notebook
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Review useful patterns</h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
              Repeated corrections stay in one card and increase their occurrence count, so the
              notebook remains focused instead of filling with duplicates.
            </p>
          </div>
        </div>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <MistakeNotebook
          mistakes={mistakes}
          onMasteredChange={updateMastered}
          onDelete={remove}
          onPracticeAgain={practiceAgain}
        />
      )}
    </div>
  )
}
