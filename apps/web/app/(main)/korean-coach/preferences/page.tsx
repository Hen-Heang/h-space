"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Settings2, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBanner } from "@/components/ui/error-banner"
import { FieldSaveStatus } from "@/components/ui/field-save-status"
import { Skeleton } from "@/components/ui/skeleton"
import { useFieldAutosave } from "@/hooks/useFieldAutosave"
import { getApiErrorMessage, koreanCoachApi } from "@/lib/api"
import {
  koreanCoachPreferencesSchema,
  type KoreanCoachPreferences,
} from "@/lib/korean-coach/schemas"
import { useSessionTimer } from "@/hooks/useSessionTimer"

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/60"

export default function KoreanCoachPreferencesPage() {
  useSessionTimer("korean_coach")
  const { saveField, stateOf } = useFieldAutosave()
  const [preferences, setPreferences] = useState<KoreanCoachPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    koreanCoachApi
      .getPreferences()
      .then((data) => {
        if (active) setPreferences(data)
      })
      .catch((cause) => {
        if (active) setError(getApiErrorMessage(cause, "Preferences could not be loaded."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Each control saves itself and confirms next to itself — the same contract
  // /settings uses. savePreferences writes the whole row, so the changed value
  // is merged into the current one here rather than read back from state,
  // which this render's closure has not seen yet.
  function update<K extends keyof KoreanCoachPreferences>(
    key: K,
    value: KoreanCoachPreferences[K],
  ) {
    const next = preferences ? { ...preferences, [key]: value } : null
    setPreferences(next)
    if (!next) return
    const parsed = koreanCoachPreferencesSchema.safeParse(next)
    if (!parsed.success) {
      setError("Check the preference values and try again.")
      return
    }
    setError("")
    saveField(key, () => koreanCoachApi.savePreferences(parsed.data))
  }

  async function deleteHistory() {
    setDeleting(true)
    setError("")
    try {
      await koreanCoachApi.deleteAllPracticeHistory()
      toast.success("Korean Coach history deleted")
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Practice history could not be deleted."))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-14">
      <header>
        <Button asChild variant="ghost" className="-ml-3 mb-3">
          <Link href="/korean-coach">
            <ArrowLeft aria-hidden="true" />
            Korean Coach
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Learning preferences</h2>
            <p className="mt-1 text-muted-foreground">Short defaults you can change at any time.</p>
          </div>
        </div>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!loading && !preferences ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="font-medium">Preferences are unavailable</p>
          <p className="text-sm text-muted-foreground">
            Check the network and database migration, then try again.
          </p>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : loading || !preferences ? (
        <Skeleton className="h-[34rem] rounded-2xl" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Coach behaviour</CardTitle>
              <CardDescription>
                Hengo keeps explanations in English and Korean prompts mainly in polite 해요체.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Korean level
                  <FieldSaveStatus state={stateOf("level")} />
                </span>
                <select
                  className={selectClass}
                  value={preferences.level}
                  onChange={(event) =>
                    update("level", event.target.value as KoreanCoachPreferences["level"])
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="lower-intermediate">Lower-intermediate</option>
                  <option value="intermediate">Intermediate</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Main goal
                  <FieldSaveStatus state={stateOf("mainGoal")} />
                </span>
                <select
                  className={selectClass}
                  value={preferences.mainGoal}
                  onChange={(event) =>
                    update("mainGoal", event.target.value as KoreanCoachPreferences["mainGoal"])
                  }
                >
                  <option value="workplace">Workplace Korean</option>
                  <option value="daily-life">Daily life</option>
                  <option value="presentation">K-Specialist presentation</option>
                  <option value="general">General conversation</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Romanization
                  <FieldSaveStatus state={stateOf("romanizationMode")} />
                </span>
                <select
                  className={selectClass}
                  value={preferences.romanizationMode}
                  onChange={(event) =>
                    update(
                      "romanizationMode",
                      event.target.value as KoreanCoachPreferences["romanizationMode"],
                    )
                  }
                >
                  <option value="always">Always show</option>
                  <option value="on-request">Show on request</option>
                  <option value="never">Never show</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Correction detail
                  <FieldSaveStatus state={stateOf("correctionStrictness")} />
                </span>
                <select
                  className={selectClass}
                  value={preferences.correctionStrictness}
                  onChange={(event) =>
                    update(
                      "correctionStrictness",
                      event.target.value as KoreanCoachPreferences["correctionStrictness"],
                    )
                  }
                >
                  <option value="gentle">Gentle</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Default speech speed
                  <FieldSaveStatus state={stateOf("defaultSpeechSpeed")} />
                </span>
                <select
                  className={selectClass}
                  value={String(preferences.defaultSpeechSpeed)}
                  onChange={(event) =>
                    update(
                      "defaultSpeechSpeed",
                      Number(event.target.value) as KoreanCoachPreferences["defaultSpeechSpeed"],
                    )
                  }
                >
                  <option value="0.75">0.75× · slow</option>
                  <option value="1">1× · normal</option>
                  <option value="1.25">1.25× · faster</option>
                </select>
              </label>

              {/* One minutes control, not two. "Preferred session length"
                  sat right beside this one, also in minutes, with a name a
                  learner could not tell apart — and nothing read it. This is
                  the number that actually drives the daily plan: it budgets
                  today's mission and fills the Daily Goal ring. */}
              <label className="space-y-2 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Daily practice goal
                  <FieldSaveStatus state={stateOf("dailyPracticeGoalMinutes")} />
                </span>
                <select
                  className={selectClass}
                  value={String(preferences.dailyPracticeGoalMinutes)}
                  onChange={(event) =>
                    update("dailyPracticeGoalMinutes", Number(event.target.value))
                  }
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                <CardTitle>Data &amp; privacy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Your recording is sent to an AI service for transcription and feedback. Do not
                record sensitive workplace or personal information. Hengo saves the transcript and
                learning feedback, not the raw recording.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="text-destructive">
                    <Trash2 aria-hidden="true" />
                    Delete Korean Coach history
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete complete practice history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes Korean Coach sessions, attempts, and saved coach
                      mistakes. Your other Hengo learning history is not affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteHistory}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting…" : "Delete history"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
